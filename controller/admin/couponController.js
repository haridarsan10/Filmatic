const Product = require('../../models/productSchema');
const Category=require('../../models/categorySchema')
const User=require('../../models/userSchema')
const Coupon=require('../../models/couponSchema')

const loadCoupon=async (req,res) => {
  try {

    const couponData=await Coupon.find({})
    res.render('coupon',{couponData:couponData})
  } catch (error) {
   console.log(error) 
   res.redirect('/admin/pageError')
  }
}

const addCoupon=async (req,res) => {
  try {
    const {code,discount,minPurchase,maxDiscount,validFrom,validTo,usageLimit}=req.body
    const couponExists=await Coupon.findOne({code:code})
    
    if(couponExists){
      return res.status(400).json({ success: false, message: 'Coupon already exists!' });
    }

    const newCoupon=new Coupon({
      code,
      discount,
      minPurchase,
      maxDiscount,
      validFrom,
      validTo,
      usageLimit
    })


    await newCoupon.save()
    return res.status(200).json({ success: true, message: 'Coupon created successfully!' });


  } catch (error) {
    console.log(error)
    res.redirect('/admin/pageError')
  }
}

const blockCoupon=async (req,res) => {
  try {
    
    const id=req.query.id
    await Coupon.findOneAndUpdate({_id:id},{$set:{isActive:false}})
    res.redirect('/admin/coupon')

  } catch (error) {
    console.log(error)
    res.redirect('/admin/pageError')
  }
}

const unblockCoupon=async (req,res) => {
  try {
    
    const id=req.query.id
    await Coupon.findOneAndUpdate({_id:id},{$set:{isActive:true}})
    res.redirect('/admin/coupon')

  } catch (error) {
    console.log(error)
    res.redirect('/admin/pageError')
  }
}


module.exports={
  loadCoupon,
  addCoupon,
  blockCoupon,
  unblockCoupon
}