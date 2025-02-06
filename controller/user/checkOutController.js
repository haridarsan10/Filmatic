const User=require('../../models/userSchema')
const Address=require('../../models/addressSchema')
const Product=require('../../models/productSchema')
const Category=require('../../models/categorySchema')
const Cart=require('../../models/cartSchema')
const mongoose=require('mongoose')


const checkOut=async (req,res) => {
  try {

    const userId=req.session.user
    const userData=req.session.userData
    const cartData=await Cart.findOne({userId:userId})

    res.render('checkOut',{user:userData})    
  } catch (error) {
    console.log(error)
    res.redirect('/pageNotFound')
  }
}




module.exports={
  checkOut
}