const express = require("express");
const { get } = require("mongoose");
const { getCategories } = require("../../controllers/category/category.controller");



const router = express.Router();
router.get("/list", getCategories);


module.exports = router;