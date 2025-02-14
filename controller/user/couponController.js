const Product = require('../../models/productSchema');
const Category=require('../../models/categorySchema')
const User=require('../../models/userSchema')
const Coupon=require('../../models/couponSchema')

const applyCoupon=async (req,res) => {
  try {
    const {couponCode,subtotal}=req.body

    if(!couponCode){
      return res.status(400).json({ success: false, message: 'Coupon code not found!' });
    }

    const couponData=await Coupon.findOne({code:couponCode})



    if(!couponData){
      return res.status(400).json({ success: false, message: 'Coupon  not found!' });
    }

    const currentDate = new Date();
    if (!couponData.isActive || currentDate < couponData.validFrom || currentDate > couponData.validTo) {
      return res.status(400).json({ success: false, message: 'Coupon is not active or expired!' });
    }

    if (couponData.usageLimit <= 0) {
      return res.status(400).json({ success: false, message: "Coupon usage limit reached" });
    }

    const calculatedDiscount = (subtotal * couponData.discount) / 100;

    const discountAmount = Math.min(calculatedDiscount, couponData.maxDiscount);

    const finalTotal = subtotal - discountAmount;

    return res.status(200).json({
      success: true,
      message: 'Coupon applied successfully!',
      discountAmount,
      finalTotal
    });

  } catch (error) {
    console.log(error)  
    res.status(500).json({ success: false, message: 'Something went wrong, please try again later.' });
  }
}

module.exports={
  applyCoupon
}