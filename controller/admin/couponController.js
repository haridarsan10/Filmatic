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

const addCoupon=async (req,res) => {
  try {
    
    console.log(req.body)

  } catch (error) {
    console.log(error)
  }
}

module.exports={
  loadCoupon,
  addCoupon
}