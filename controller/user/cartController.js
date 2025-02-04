const User=require('../../models/userSchema')
const Address=require('../../models/addressSchema')
const Product=require('../../models/productSchema')
const Category=require('../../models/categorySchema')
const Cart=require('../../models/cartSchema')


const loadCart=async (req,res) => {
  try {
    const userData=req.session.userData
    res.render('cart',{user:userData})
  } catch (error) {
    
  }
}

const addToCart=async (req,res) => {
  try {
    const {productId}=req.body
    console.log(productId)
    const productData=await Product.findOne({_id:productId})
    console.log(productData)
 

  } catch (error) {
    console.log(error)
  }
}

module.exports={
  loadCart,
  addToCart
}