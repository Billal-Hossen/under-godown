// const Cart = require("../../models/Cart");
// // const Product = require("../../models/Product");
// const Product = require("../../data/models/Product");
// const addToCart = async (req, res) => {
//   try {
//     const { userId, productId, quantity } = req.body;

//     if (!userId || !productId || quantity <= 0) {
//       return res.status(400).json({
//         success: false,
//         message: "Invalid data provided!",
//       });
//     }

//     const product = await Product.findById(productId);

//     if (!product) {
//       return res.status(404).json({
//         success: false,
//         message: "Product not found",
//       });
//     }

//     let cart = await Cart.findOne({ userId });

//     if (!cart) {
//       cart = new Cart({ userId, items: [] });
//     }

//     const findCurrentProductIndex = cart.items.findIndex(
//       (item) => item.productId.toString() === productId
//     );

//     if (findCurrentProductIndex === -1) {
//       cart.items.push({ productId, quantity });
//     } else {
//       cart.items[findCurrentProductIndex].quantity += quantity;
//     }

//     await cart.save();
//     res.status(200).json({
//       success: true,
//       data: cart,
//     });
//   } catch (error) {
//     console.log(error);
//     res.status(500).json({
//       success: false,
//       message: "Error",
//     });
//   }
// };

// const fetchCartItems = async (req, res) => {
//   try {
//     const { userId } = req.params;

//     if (!userId) {
//       return res.status(400).json({
//         success: false,
//         message: "User id is manadatory!",
//       });
//     }

//     const cart = await Cart.findOne({ userId }).populate({
//       path: "items.productId",
//       select: "image title price salePrice",
//     });

//     if (!cart) {
//       return res.status(404).json({
//         success: false,
//         message: "Cart not found!",
//       });
//     }

//     const validItems = cart.items.filter(
//       (productItem) => productItem.productId
//     );

//     if (validItems.length < cart.items.length) {
//       cart.items = validItems;
//       await cart.save();
//     }

//     const populateCartItems = validItems.map((item) => ({
//       productId: item.productId._id,
//       image: item.productId.image,
//       title: item.productId.title,
//       price: item.productId.price,
//       salePrice: item.productId.salePrice,
//       quantity: item.quantity,
//     }));

//     res.status(200).json({
//       success: true,
//       data: {
//         ...cart._doc,
//         items: populateCartItems,
//       },
//     });
//   } catch (error) {
//     console.log(error);
//     res.status(500).json({
//       success: false,
//       message: "Error",
//     });
//   }
// };

// const updateCartItemQty = async (req, res) => {
//   try {
//     const { userId, productId, quantity } = req.body;

//     if (!userId || !productId || quantity <= 0) {
//       return res.status(400).json({
//         success: false,
//         message: "Invalid data provided!",
//       });
//     }

//     const cart = await Cart.findOne({ userId });
//     if (!cart) {
//       return res.status(404).json({
//         success: false,
//         message: "Cart not found!",
//       });
//     }

//     const findCurrentProductIndex = cart.items.findIndex(
//       (item) => item.productId.toString() === productId
//     );

//     if (findCurrentProductIndex === -1) {
//       return res.status(404).json({
//         success: false,
//         message: "Cart item not present !",
//       });
//     }

//     cart.items[findCurrentProductIndex].quantity = quantity;
//     await cart.save();

//     await cart.populate({
//       path: "items.productId",
//       select: "image title price salePrice",
//     });

//     const populateCartItems = cart.items.map((item) => ({
//       productId: item.productId ? item.productId._id : null,
//       image: item.productId ? item.productId.image : null,
//       title: item.productId ? item.productId.title : "Product not found",
//       price: item.productId ? item.productId.price : null,
//       salePrice: item.productId ? item.productId.salePrice : null,
//       quantity: item.quantity,
//     }));

//     res.status(200).json({
//       success: true,
//       data: {
//         ...cart._doc,
//         items: populateCartItems,
//       },
//     });
//   } catch (error) {
//     console.log(error);
//     res.status(500).json({
//       success: false,
//       message: "Error",
//     });
//   }
// };

// const deleteCartItem = async (req, res) => {
//   try {
//     const { userId, productId } = req.params;
//     if (!userId || !productId) {
//       return res.status(400).json({
//         success: false,
//         message: "Invalid data provided!",
//       });
//     }

//     const cart = await Cart.findOne({ userId }).populate({
//       path: "items.productId",
//       select: "image title price salePrice",
//     });

//     if (!cart) {
//       return res.status(404).json({
//         success: false,
//         message: "Cart not found!",
//       });
//     }

//     cart.items = cart.items.filter(
//       (item) => item.productId._id.toString() !== productId
//     );

//     await cart.save();

//     await cart.populate({
//       path: "items.productId",
//       select: "image title price salePrice",
//     });

//     const populateCartItems = cart.items.map((item) => ({
//       productId: item.productId ? item.productId._id : null,
//       image: item.productId ? item.productId.image : null,
//       title: item.productId ? item.productId.title : "Product not found",
//       price: item.productId ? item.productId.price : null,
//       salePrice: item.productId ? item.productId.salePrice : null,
//       quantity: item.quantity,
//     }));

//     res.status(200).json({
//       success: true,
//       data: {
//         ...cart._doc,
//         items: populateCartItems,
//       },
//     });
//   } catch (error) {
//     console.log(error);
//     res.status(500).json({
//       success: false,
//       message: "Error",
//     });
//   }
// };

// module.exports = {
//   addToCart,
//   updateCartItemQty,
//   deleteCartItem,
//   fetchCartItems,
// };


const Product = require("../../data/models/Product");
const redisClient = require("../../redis/redisClient");



// Helper: Redis Key
const getCartKey = (userId) => `cart:${userId}`;

// Add to Cart
const addToCart = async (req, res) => {
  try {
    let { userId, productId, quantity } = req.body;
    console.log("add to cart req.body", req.body);

    if (!userId || !productId || quantity <= 0) {
      return res.status(400).json({
        success: false,
        message: "Invalid data provided!",
      });
    }

    const product = await Product.findById(productId);
    if (!product) {
      return res.status(404).json({ success: false, message: "Product not found" });
    }

    console.log("product found", product);

    if (product.totalStock < quantity) {
      return res.status(400).json({ success: false, message: "Not enough stock available" });
    }

    // DB থেকে stock কমাও
    product.totalStock -= quantity;
    await product.save();

    const cartKey = getCartKey(userId);
    console.log("cartKey", cartKey);

    // Redis এ cart data set করো

    // console.log("Existing Cart:", cart);
    // cart = cart ? JSON.parse(cart) : { items: [] };

    // const itemIndex = cart.items.findIndex((item) => item.productId === productId);
    // if (itemIndex === -1) {
    //   cart.items.push({ productId, quantity });
    // } else {
    //   cart.items[itemIndex].quantity += quantity;
    // }

    // Redis এ save + 10 মিনিট TTL
    // await redisClient.set(cartKey, JSON.stringify(cart), "EX", 600);
    // console.log("Updated Cart:", cart);

    // return res.status(200).json({
    //   success: true,
    //   message: "Product added to cart",
    //   cart,
    // });

    //       // normalize
      quantity = parseInt(quantity, 10);
  
      const itemField = `item:${productId}`;
      const nowIso = new Date().toISOString();
      const TTL_SECONDS =  600; // 1 hour
  
      // ----- Redis write: atomic increment for this product -----
      let newQty = await redisClient.hincrby(cartKey, itemField, quantity);
  
  
      // if anything ever made it <= 0, delete the item (safety)
      if (newQty < 1) {
        await redisClient.hdel(cartKey, itemField);
        newQty = 0;
      }
  
      // meta + TTL in a single pipeline
      const tx = redisClient.multi();
      tx.hset(cartKey, 'meta:userId', String(userId));
      tx.hsetnx(cartKey, 'meta:createdAt', nowIso); // set once
      tx.hset(cartKey, 'meta:updatedAt', nowIso);
      tx.expire(cartKey, TTL_SECONDS);
      await tx.exec();
  
      // ----- Build response cart from Redis (Mongo-like shape) -----
      const raw = await redisClient.hgetall(cartKey);
      // raw => { 'meta:userId': '...', 'meta:createdAt': '...', 'meta:updatedAt': '...', 'item:<pid>': '<qty>', ... }
  
      const items = Object.entries(raw)
        .filter(([key]) => key.startsWith('item:'))
        .map(([key, qty]) => ({
          productId: key.replace(/^item:/, ''),
          quantity: parseInt(qty, 10),
          image: product?.image,
          title: product?.title,
          price: product?.price,
          salePrice: product?.salePrice,
        }))
        .filter((it) => it.quantity > 0);
  
      const cart = {
        userId: raw['meta:userId'] || userId,
        items,
        createdAt: raw['meta:createdAt'] ? new Date(raw['meta:createdAt']) : new Date(),
        updatedAt: raw['meta:updatedAt'] ? new Date(raw['meta:updatedAt']) : new Date(),
      };
  console.log("cart item from redis", cart);
      return res.status(200).json({
        success: true,
        data: cart, // <-- same shape key as your Mongo handler
      });
  } catch (error) {
    console.error("AddToCart Error", error);
    res.status(500).json({ success: false, message: "Error" });
  }
};

// Fetch Cart Items
const fetchCartItems = async (req, res) => {
  try {
    const { userId } = req.params;
    if (!userId) {
      return res.status(400).json({ success: false, message: "User ID required" });
    }

    const cartKey = getCartKey(userId);
    const raw = await redisClient.hgetall(cartKey);

    if (!raw || Object.keys(raw).length === 0) {
      return res.status(200).json({
        success: true,
        data: { userId, items: [], createdAt: null, updatedAt: null },
      });
    }

    // build items with product details
    const items = (
      await Promise.all(
        Object.entries(raw)
          .filter(([field]) => field.startsWith("item:"))
          .map(async ([field, qty]) => {
            const productId = field.replace(/^item:/, "");
            const quantity = parseInt(qty, 10);
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
      )
    ).filter(Boolean); // remove nulls

    return res.status(200).json({
      success: true,
      data: {
        userId: raw["meta:userId"] || userId,
        items,
        createdAt: raw["meta:createdAt"] ? new Date(raw["meta:createdAt"]) : null,
        updatedAt: raw["meta:updatedAt"] ? new Date(raw["meta:updatedAt"]) : null,
      },
    });
  } catch (error) {
    console.error("FetchCart Error", error);
    res.status(500).json({ success: false, message: "Error" });
  }
};


// Redis Key Expiry Listener → TTL শেষ হলে stock restore
// redisClient.pSubscribe("__keyevent@0__:expired", async (message) => {
//   if (message.startsWith("cart:")) {
//     const userId = message.split(":")[1];

//     console.log(`Cart expired for user: ${userId}`);

//     // Expired হওয়ার আগে cache এ data restore করার জন্য
//     // Redis expired হলে সরাসরি value পাওয়া যায় না তাই 
//     // এখানে alternative হলো "set cart with TTL + shadow copy Mongo তে রাখা"
//     // নইলে expire হলে data হারিয়ে যাবে।
//   }
// });

// ✅ Better approach → Cron Job দিয়ে Redis check করে DB restore
// (প্রতি 1 মিনিটে Redis check করা যায় যে cart expire হতে যাচ্ছে কিনা)

// Update / Delete Cart Items করলে Redis + DB দুই জায়গায় handle করতে হবে

// Update cart item quantity
const updateCartItemQty = async (req, res) => {
  try {
    const { userId, productId, quantity } = req.body;
    const cartKey = getCartKey(userId);

    let cart = await redis.get(cartKey);
    if (!cart) {
      return res.status(404).json({ success: false, message: "Cart not found!" });
    }

    cart = JSON.parse(cart);
    const productIndex = cart.findIndex((item) => item.productId === productId);
    if (productIndex === -1) {
      return res.status(404).json({ success: false, message: "Item not in cart!" });
    }

    cart[productIndex].quantity = quantity;

    await redis.set(cartKey, JSON.stringify(cart), "EX", 600);

    res.status(200).json({ success: true, data: cart });
  } catch (error) {
    console.error(error);
    res.status(500).json({ success: false, message: "Error" });
  }
};

// Delete cart item
const deleteCartItem = async (req, res) => {
  try {
    const { userId, productId } = req.params;
    const cartKey = getCartKey(userId);

    let cart = await redis.get(cartKey);
    if (!cart) {
      return res.status(404).json({ success: false, message: "Cart not found!" });
    }

    cart = JSON.parse(cart).filter((item) => item.productId !== productId);

    await redis.set(cartKey, JSON.stringify(cart), "EX", 600);

    res.status(200).json({ success: true, data: cart });
  } catch (error) {
    console.error(error);
    res.status(500).json({ success: false, message: "Error" });
  }
};

module.exports = {
  addToCart,
  fetchCartItems,
  updateCartItemQty,
  deleteCartItem,
};