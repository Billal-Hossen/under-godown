const ApiError = require("../../utils/ApiError");
const Order = require("../../models/Order");

const getAllOrdersOfAllUsers = async (req, res, next) => {
  try {
    const orders = await Order.find({});

    if (!orders.length)
      throw new ApiError(404, "No orders found!", [{ field: "orders", message: "No orders found!" }]);
    res.status(200).json({
      success: true,
      data: orders,
    });
  } catch (e) {
    next(e);
  }
};

const getOrderDetailsForAdmin = async (req, res, next) => {
  try {
    const { id } = req.params;

    const order = await Order.findById(id);

    if (!order)
      throw new ApiError(404, "Order not found!", [{ field: "order", message: "Order not found!" }]);

    res.status(200).json({
      success: true,
      data: order,
    });
  } catch (e) {
    next(e);
  }
};

const updateOrderStatus = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { orderStatus } = req.body;

    const order = await Order.findById(id);

    if (!order) throw new ApiError(404, "Order not found!", [{ field: "order", message: "Order not found!" }]);

    if (!orderStatus || orderStatus.trim() === "")
      throw new ApiError(400, "Order status is required!", [{ field: "orderStatus", message: "Order status is required!" }]);

    await Order.findByIdAndUpdate(id, { orderStatus });

    res.status(200).json({
      success: true,
      message: "Order status is updated successfully!",
    });
  } catch (e) {
    next(e);
  }
};

module.exports = {
  getAllOrdersOfAllUsers,
  getOrderDetailsForAdmin,
  updateOrderStatus,
};
