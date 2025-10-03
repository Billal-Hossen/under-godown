const Category = require("../../data/models/Category");
const ApiError = require("../../utils/ApiError");

const getCategories = async (req, res, next) => {
  try {
    const categories = await Category.find({});

    if (!categories.length)
      throw new ApiError(404, "No categories found!", [{ field: "categories", message: "No categories found!" }]);
    res.status(200).json({
      success: true,
      data: categories,
    });
  } catch (e) {
    next(e);
  }
};

module.exports = {getCategories}