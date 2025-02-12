const Product = require('../../models/productSchema');
const Category=require('../../models/categorySchema')
const User=require('../../models/userSchema')
const Coupon=require('../../models/couponSchema')

const loadCoupon=async (req,res) => {
  try {
    res.render('coupon')
  } catch (error) {
   console.log(error) 
  }
}

module.exports={
  loadCoupon
}