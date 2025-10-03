// const paypal = require("../../helpers/paypal");
const Order = require("../../models/Order");
const Cart = require("../../models/Cart");
// const Product = require("../../models/Product");
const Product = require("../../data/models/Product");

const { CartItem } = require('../models/cartItem');
const { Profile } = require('../models/profile');
const { Order } = require('../models/order');
const { Payment } = require('../models/payment');
const path = require('path');
const SSLCommerz = require("ssl-commerz-node");
const PaymentSession = SSLCommerz.PaymentSession;
const mongoose = require('mongoose');

// Validate SSLCommerz IPN request
const validateIPN = (paymentData) => {
  // Implement validation logic to verify the request is from SSLCommerz
  // This typically involves checking a hash/secret key
  return true; // Placeholder - implement actual validation
};

const ipn = async (req, res) => {
  const session = await mongoose.startSession();
  session.startTransaction();

  try {
    if (!validateIPN(req.body)) {
      return res.status(400).send("Invalid IPN request");
    }

    const payment = new Payment(req.body);
    const tran_id = payment['tran_id'];

    if (payment['status'] === 'VALID') {
      // Update order status
      const order = await Order.findOneAndUpdate(
        { transaction_id: tran_id },
        { status: "completed", updatedAt: new Date() },
        { new: true, session }
      );

      if (!order) {
        throw new Error('Order not found');
      }

      // Clear cart items
      await CartItem.deleteMany({ _id: { $in: order.cartItems } }, { session });
    } else {
      // If payment failed, mark order as failed
      await Order.findOneAndUpdate(
        { transaction_id: tran_id },
        { status: "failed", updatedAt: new Date() },
        { session }
      );

      // Optionally, you might not want to delete the order immediately
      // await Order.deleteOne({ transaction_id: tran_id }, { session });
    }

    await payment.save({ session });
    await session.commitTransaction();

    return res.status(200).send("IPN processed successfully");
  } catch (error) {
    await session.abortTransaction();
    console.error('IPN processing error:', error);
    return res.status(500).send("IPN processing failed");
  } finally {
    session.endSession();
  }
};

const initPayment = async (req, res) => {
  try {
    const userId = req.user._id;

    // Get cart items with product details populated if needed
    const cartItems = await CartItem.find({ user: userId }).populate('product');

    if (!cartItems || cartItems.length === 0) {
      return res.status(400).json({
        success: false,
        message: "Cart is empty"
      });
    }

    const totalAmount = cartItems.reduce((sum, item) => sum + (item.price * item.count), 0);
    const totalItem = cartItems.reduce((sum, item) => sum + item.count, 0);

    // Better transaction ID generation
    const tran_id = `TXN_${Date.now()}_${Math.floor(Math.random() * 1000)}`;
    const profile = await Profile.findOne({ user: userId });

    if (!profile) {
      return res.status(400).json({
        success: false,
        message: "User profile not found"
      });
    }

    const { phone, address1, address2, city, postcode, state, country } = profile;

    // Initialize payment
    const payment = new PaymentSession(
      process.env.NODE_ENV !== 'production', // Sandbox mode in non-production
      process.env.SSLCOMMERZ_STORE_ID,
      process.env.SSLCOMMERZ_STORE_PASSWORD
    );

    // Set URLs from environment variables
    payment.setUrls({
      success: `${process.env.BASE_URL}/api/payment/success`,
      fail: `${process.env.BASE_URL}/api/payment/fail`,
      cancel: `${process.env.BASE_URL}/api/payment/cancel`,
      ipn: `${process.env.BASE_URL}/api/payment/ipn`,
    });

    // Set order details
    payment.setOrderInfo({
      total_amount: totalAmount,
      currency: "BDT",
      tran_id: tran_id,
      emi_option: 0,
    });

    // Set customer info
    payment.setCusInfo({
      name: req.user.name,
      email: req.user.email,
      add1: address1,
      add2: address2 || '',
      city: city,
      state: state,
      postcode: postcode,
      country: country,
      phone: phone,
      fax: phone,
    });

    // Set shipping info
    payment.setShippingInfo({
      method: "Courier",
      num_item: totalItem,
      name: req.user.name,
      add1: address1,
      add2: address2 || '',
      city: city,
      state: state,
      postcode: postcode,
      country: country,
    });

    // Set product info
    payment.setProductInfo({
      product_name: "E-Commerce Products",
      product_category: "General",
      product_profile: "physical-goods", // More appropriate for e-commerce
    });

    // Add product details
    payment.setAdditionalInfo({
      value_a: userId.toString(),
      value_b: JSON.stringify(cartItems.map(item => item.productId)),
      value_c: "ecommerce-order",
    });

    const response = await payment.paymentInit();

    if (response.status !== 'SUCCESS') {
      return res.status(400).json({
        success: false,
        message: "Payment initialization failed",
        error: response.message
      });
    }

    // Create order in database
    const order = new Order({
      user: userId,
      cartItems: cartItems.map(item => item._id),
      transaction_id: tran_id,
      address: profile,
      amount: totalAmount,
      status: "pending",
      sessionKey: response.sessionkey,
      paymentMethod: "SSLCommerz"
    });

    await order.save();

    return res.status(200).json({
      success: true,
      paymentUrl: response.GatewayPageURL,
      orderId: order._id,
      transactionId: tran_id
    });

  } catch (error) {
    console.error('Payment initialization error:', error);
    return res.status(500).json({
      success: false,
      message: "Payment initialization failed",
      error: error.message
    });
  }
};

const paymentSuccess = async (req, res) => {
  try {
    // You might want to verify the payment here before showing success
    res.sendFile(path.join(__dirname, "../public/success.html"));
  } catch (error) {
    console.error('Success page error:', error);
    res.status(500).send("Error loading success page");
  }
};

const paymentFailed = async (req, res) => {
  try {
    res.sendFile(path.join(__dirname, "../public/failed.html"));
  } catch (error) {
    console.error('Failed page error:', error);
    res.status(500).send("Error loading failed page");
  }
};

const paymentCancel = async (req, res) => {
  try {
    res.sendFile(path.join(__dirname, "../public/cancel.html"));
  } catch (error) {
    console.error('Cancel page error:', error);
    res.status(500).send("Error loading cancel page");
  }
};

module.exports = {
  ipn,
  initPayment,
  paymentSuccess,
  paymentCancel,
  paymentFailed

};
