const User=require('../../models/userSchema')
const Address=require('../../models/addressSchema')
const Product=require('../../models/productSchema')
const Category=require('../../models/categorySchema')
const Cart=require('../../models/cartSchema')
const mongoose=require('mongoose')


const loadOrders=async (req,res) => {
  try {
    const userData=req.session.userData
    res.render('orders',{user:userData})
  } catch (error) {
    
  }
}

const orders=async (req,res) => {
  try {
    const {addressId,paymentMethod,totalPrice}=req.body

    return res.status(200).json({ success: true, message: "Data received" });

  } catch (error) {
    res.redirect('/pageNotFound')
    console.log(error)
  }
}

module.exports={
  orders,
  loadOrders
}