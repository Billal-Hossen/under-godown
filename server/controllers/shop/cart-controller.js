// src/cart/cart.all-in-one.js
// ---------------------------------------------------------
// ONE FILE: Redis Cart + Stock Consistency (10-min idle auto-release)
// Assumes: ioredis style methods (hgetall/hget/hset/hdel).
// If you use node-redis v4, replace methods as noted in comments.
// ---------------------------------------------------------

// Adjust these two requires to your project structure:
const redis = require('../../redis/redisClient');      // ioredis client (or node-redis v4 -> rename methods)
const Product = require('../../data/models/Product');       // Mongoose Product model

// ------------------------------
// Constants & Simple Utilities
// ------------------------------
const CART_IDLE_SECONDS = 600;             // 10 minutes
const CART_EXPIRY_SET   = 'cart:expiry';   // ZSET: member = cartKey, score = expiresAt(ms)
const MAX_PER_PRODUCT   = 5;

const cartKeyOf = (userId) => `cart:${userId}`;
const nowIso = () => new Date().toISOString();

// For node-redis v4 users: method rename map (reference)
// - hgetall -> hGetAll
// - hget    -> hGet
// - hset    -> hSet
// - hdel    -> hDel
// - hincrby -> hIncrBy
// - exists  -> exists (same)
// - zadd    -> zAdd (but ioredis syntax is used here)
// - zrangebyscore -> zRangeByScore
// - zscore  -> zScore
// - zrem    -> zRem
// - set NX PX -> set with { NX: true, PX: ttl }

// ------------------------------
// Shared Helpers (Meta/TTL, mapping, stock)
// ------------------------------
async function setMetaAndSchedule(cartKey, userId) {
  const now = Date.now();
  const expiresAt = now + CART_IDLE_SECONDS * 1000;
  const tx = redis.multi();
  tx.hsetnx(cartKey, 'meta:userId', String(userId));
  tx.hsetnx(cartKey, 'meta:createdAt', nowIso());
  tx.hset(cartKey, 'meta:updatedAt', nowIso());
  // schedule/refresh expiry score
  tx.zadd(CART_EXPIRY_SET, expiresAt, cartKey);
  await tx.exec();
}

async function extractItems(raw) {
  const items = await Promise.all(
    Object.entries(raw)
      .filter(([k]) => k.startsWith("item:"))
      .map(async ([k, v]) => {
        const productId = k.replace(/^item:/, "");
        const quantity = parseInt(v, 10);
        if (quantity <= 0) return null;

        const product = await Product.findById(productId);
        if (!product) return null;

        return {
          productId,
          quantity,
          image: product.image,
          title: product.title,
          price: product.price,
          salePrice: product.salePrice,
        };
      })
  );

  return items.filter(Boolean); // removes null
}


 async function buildCartShape(userId, raw) {
  return {
    userId: raw['meta:userId'] || userId,
    items: await extractItems(raw),
    createdAt: raw['meta:createdAt'] ? new Date(raw['meta:createdAt']) : null,
    updatedAt: raw['meta:updatedAt'] ? new Date(raw['meta:updatedAt']) : null,
  };
}

// Reserve N units from Product.totalStock (decrease stock). Returns reserved (0..need)
async function reserveFromStock(productId, need) {
  if (need <= 0) return 0;
  const prod = await Product.findById(productId).select('totalStock').lean();
  if (!prod) return 0;
  const allowed = Math.min(need, Math.max(0, prod.totalStock));
  if (allowed <= 0) return 0;
  await Product.updateOne({ _id: productId }, { $inc: { totalStock: -allowed } });
  return allowed;
}

// Return units to stock (increase Product.totalStock)
async function releaseToStock(productId, units) {
  if (units <= 0) return;
  await Product.updateOne({ _id: productId }, { $inc: { totalStock: units } });
}

// ------------------------------
// Scheduler (call after any cart mutation)
// ------------------------------
async function scheduleCartExpiry(userId) {
  const cartKey = cartKeyOf(userId);
  await setMetaAndSchedule(cartKey, userId);
}

// ------------------------------
// Expiry Worker (runs periodically)
// ------------------------------

// Lightweight lock (single-node). For multi-instance, use redlock.
async function acquireLock(key, ttlMs) {
  // ioredis style: set(key, val, 'NX', 'PX', ttlMs)
  // node-redis v4: await redis.set(key, '1', { NX: true, PX: ttlMs })
  const ok = await redis.set(key, '1', 'NX', 'PX', ttlMs);
  return !!ok;
}
async function releaseLock(key) { try { await redis.del(key); } catch (_) {} }

function extractItemMap(raw) {
  const map = new Map();
  for (const [k, v] of Object.entries(raw)) {
    if (!k.startsWith('item:')) continue;
    const pid = k.slice(5);
    const qty = parseInt(v, 10) || 0;
    if (qty > 0) map.set(pid, (map.get(pid) || 0) + qty);
  }
  return map; // Map<productId, qty>
}

async function releaseStockFromMap(qtyMap) {
  if (!qtyMap || qtyMap.size === 0) return;
  const ops = [];
  qtyMap.forEach((qty, productId) => {
    ops.push({ updateOne: { filter: { _id: productId }, update: { $inc: { totalStock: qty } } } });
  });
  if (ops.length) await Product.bulkWrite(ops);
}

async function processDueCartsOnce(batchSize = 50) {
  const now = Date.now();
  // ioredis: zrangebyscore key min max LIMIT offset count
  const due = await redis.zrangebyscore(CART_EXPIRY_SET, 0, now, 'LIMIT', 0, batchSize);
  if (!due || due.length === 0) return 0;

  for (const cartKey of due) {
    const lockKey = `lock:expire:${cartKey}`;
    const got = await acquireLock(lockKey, 10_000);
    if (!got) continue;

    try {
      const score = await redis.zscore(CART_EXPIRY_SET, cartKey);
      if (score && Number(score) > now) {
        await releaseLock(lockKey);
        continue;
      }

      const raw = await redis.hgetall(cartKey);
      if (!raw || Object.keys(raw).length === 0) {
        await redis.zrem(CART_EXPIRY_SET, cartKey);
        await releaseLock(lockKey);
        continue;
      }

      // return reserved quantities back to Product
      const qtyMap = extractItemMap(raw);
      await releaseStockFromMap(qtyMap);

      const tx = redis.multi();
      tx.del(cartKey);
      tx.zrem(CART_EXPIRY_SET, cartKey);
      await tx.exec();
    } catch (e) {
      console.error('expiry error for', cartKey, e);
      // keep it in ZSET to retry next tick
    } finally {
      await releaseLock(lockKey);
    }
  }
  return due.length;
}

function startCartExpiryWorker({ intervalMs = 5000, batchSize = 100 } = {}) {
  const mainLock = 'lock:cart-expiry-worker';
  const tick = async () => {
    try {
      const got = await acquireLock(mainLock, intervalMs - 50);
      if (!got) return;
      try {
        let processed;
        do {
          processed = await processDueCartsOnce(batchSize);
        } while (processed === batchSize);
      } finally {
        await releaseLock(mainLock);
      }
    } catch (e) {
      console.error('cart-expiry main loop error:', e);
    }
  };
  const id = setInterval(tick, intervalMs);
  console.log(`[cart-expiry] worker started (every ${intervalMs}ms)`);
  return () => clearInterval(id);
}

// ------------------------------
// Cart Controllers (Express handlers)
// ------------------------------
exports.addToCart = async (req, res) => {
  try {
    let { userId, productId, quantity } = req.body || {};
    if (!userId || !productId || !Number.isFinite(+quantity) || +quantity <= 0) {
      return res.status(400).json({ success: false, message: 'Invalid data provided!' });
    }
    quantity = parseInt(quantity, 10);

    const cartKey = cartKeyOf(userId);
    const itemField = `item:${productId}`;

    const curStr = await redis.hget(cartKey, itemField);
    const curQty = curStr ? parseInt(curStr, 10) : 0;

    // cap 5 per product
    const maxRoom = Math.max(0, MAX_PER_PRODUCT - curQty);
    if (maxRoom <= 0) {
      await setMetaAndSchedule(cartKey, userId);
      const raw = await redis.hgetall(cartKey);
  
      return res.status(200).json({
        success: true,
        alert: { type: 'warning', message: `Maximum quantity is ${MAX_PER_PRODUCT} for this product.` },
        data: buildCartShape(userId, raw),
      });
    }

    // cap by stock
    const reqAdd = Math.min(quantity, maxRoom);
    const reserved = await reserveFromStock(productId, reqAdd);
    if (reserved <= 0) {
      await setMetaAndSchedule(cartKey, userId);
      const raw = await redis.hgetall(cartKey);
      return res.status(200).json({
        success: true,
        alert: { type: 'warning', message: 'Out of stock for this product.' },
        data: buildCartShape(userId, raw),
      });
    }

    const newQty = curQty + reserved;
    await redis.hset(cartKey, itemField, newQty);
    await setMetaAndSchedule(cartKey, userId);

    const raw = await redis.hgetall(cartKey);
        console.log('addToCart maxed out:', await buildCartShape(userId, raw));
    return res.status(200).json({
      success: true,
      message: reserved < quantity ? `Only ${reserved} added due to limit/stock.` : 'Item added.',
      data: await buildCartShape(userId, raw),
    });
  } catch (err) {
    console.error('addToCart error:', err);
    return res.status(500).json({ success: false, message: 'Error' });
  }
};

exports.getCart = async (req, res) => {
  try {
    const userId = req.params.userId;
    console.log("userId", userId)
    const cartKey = cartKeyOf(userId);
    console.log("raw", cartKey)
     const raw = await redis.hgetall(cartKey);
     


    if (!raw || Object.keys(raw).length === 0) {
      return res.status(200).json({
        success: true,
        data: { userId, items: [], createdAt: null, updatedAt: null },
      });
    }
    return res.status(200).json({ success: true, data:await buildCartShape(userId, raw) });
  } catch (err) {
    console.error('getCart error:', err);
    return res.status(500).json({ success: false, message: 'Failed to retrieve cart' });
  }
};

// type: 'increment' | 'decrement'. Enforces max 5, syncs stock both ways.
exports.updateCartItemQty = async (req, res) => {
  try {
    const { userId, productId, quantity, type = 'increment' } = req.body;
    if (!userId || !productId || !Number.isFinite(+quantity) || +quantity <= 0) {
      return res.status(400).json({ success: false, message: 'Invalid data provided!' });
    }

    const cartKey = cartKeyOf(userId);
    const itemField = `item:${productId}`;
    const inc = parseInt(quantity, 10);
    const isInc = String(type).toLowerCase() === 'increment';

    const curStr = await redis.hget(cartKey, itemField);
    const curQty = curStr ? parseInt(curStr, 10) : 0;

    let targetQty = curQty;
    let removed = false;
    let capped = false;
    let alert = null;

    if (isInc) {
      const maxRoom = Math.max(0, MAX_PER_PRODUCT - curQty);
      if (maxRoom <= 0) {
        alert = { type: 'warning', message: `Maximum quantity is ${MAX_PER_PRODUCT} for this product.` };
      } else {
        const reqAdd = Math.min(inc, maxRoom);
        const reserved = await reserveFromStock(productId, reqAdd);
        if (reserved <= 0) {
          alert = { type: 'warning', message: 'Out of stock for this product.' };
        } else {
          targetQty = curQty + reserved;
          await redis.hset(cartKey, itemField, targetQty);
          if (reserved < inc) {
            capped = true;
            alert = { type: 'warning', message: `Only ${reserved} added (limit/stock).` };
          }
        }
      }
    } else {
      // decrement: release back to stock
      const actualDecrease = Math.min(inc, curQty);
      if (actualDecrease > 0) {
        targetQty = curQty - actualDecrease;
        await redis.hset(cartKey, itemField, targetQty);
        await releaseToStock(productId, actualDecrease);
        if (targetQty <= 0) {
          await redis.hdel(cartKey, itemField);
          removed = true;
        }
      }
    }

    await setMetaAndSchedule(cartKey, userId);
    const raw = await redis.hgetall(cartKey);

    return res.status(200).json({
      success: true,
      message: removed
        ? 'Cart item removed (quantity reached 0).'
        : isInc
          ? (capped ? 'Quantity increased (limited).' : (alert ? 'Quantity unchanged (limit/stock).' : 'Quantity increased.'))
          : 'Quantity decreased.',
      alert,
      data: await buildCartShape(userId, raw),
    });
  } catch (err) {
    console.error('updateCartItemQty error:', err);
    return res.status(500).json({ success: false, message: 'Error' });
  }
};

exports.deleteCartItem = async (req, res) => {
  try {
    const { userId, productId } = req.params;
    if (!userId || !productId) {
      return res.status(400).json({ success: false, message: 'Invalid data provided!' });
    }

    const cartKey = cartKeyOf(userId);
    const itemField = `item:${productId}`;

    const exists = await redis.exists(cartKey);
    if (!exists) {
      return res.status(404).json({ success: false, message: 'Cart not found!' });
    }

    const curStr = await redis.hget(cartKey, itemField);
    const curQty = curStr ? parseInt(curStr, 10) : 0;

    if (curQty > 0) {
      await redis.hdel(cartKey, itemField);
      await releaseToStock(productId, curQty);
    }

    await setMetaAndSchedule(cartKey, userId);
    const raw = await redis.hgetall(cartKey);

    const anyItems = Object.keys(raw || {}).some((k) => k.startsWith('item:'));
    if (!anyItems) {
      return res.status(200).json({
        success: true,
        data: {
          userId: raw['meta:userId'] || userId,
          items: [],
          createdAt: raw['meta:createdAt'] ? new Date(raw['meta:createdAt']) : null,
          updatedAt: raw['meta:updatedAt'] ? new Date(raw['meta:updatedAt']) : null,
        },
      });
    }
    return res.status(200).json({ success: true, data: await buildCartShape(userId, raw) });
  } catch (err) {
    console.error('deleteCartItem error:', err);
    return res.status(500).json({ success: false, message: 'Error' });
  }
};

// ------------------------------
// Worker start helper (call once on server start)
// ------------------------------
function startCartExpiryWorker(opts = { intervalMs: 5000, batchSize: 100 }) {
  return _startCartExpiryWorker(opts);
}
function _startCartExpiryWorker({ intervalMs = 5000, batchSize = 100 } = {}) {
  const mainLock = 'lock:cart-expiry-worker';
  const tick = async () => {
    try {
      const ok = await acquireLock(mainLock, intervalMs - 50);
      if (!ok) return;
      try {
        let processed;
        do {
          processed = await processDueCartsOnce(batchSize);
        } while (processed === batchSize);
      } finally {
        await releaseLock(mainLock);
      }
    } catch (e) {
      console.error('cart-expiry main loop error:', e);
    }
  };
  const id = setInterval(tick, intervalMs);
  console.log(`[cart-expiry] worker started (every ${intervalMs}ms)`);
  return () => clearInterval(id);
}

module.exports = {
  // handlers
  addToCart: exports.addToCart,
  getCart: exports.getCart,
  updateCartItemQty: exports.updateCartItemQty,
  deleteCartItem: exports.deleteCartItem,
  // scheduler (if you need to call directly)
  scheduleCartExpiry,
//   // worker
  startCartExpiryWorker,
};
