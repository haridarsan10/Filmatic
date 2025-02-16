const User=require('../../models/userSchema')
const Address=require('../../models/addressSchema')
const Product=require('../../models/productSchema')
const Category=require('../../models/categorySchema')
const Cart=require('../../models/cartSchema')
const WishList=require('../../models/wishlistSchema')

const loadwallet=async(req,res)=>{
  try {

   const userData=req.session.userData
   res.render('wallet',{user:userData})
   
  } catch (error) {
    console.log(error)
    res.redirect('/pageNotFound')    
  }
}


const loadwalletHistory=async (req,res) => {
  try {
   const userData=req.session.userData
   res.render('wallet-history',{user:userData})

  } catch (error) {
    console.log(error)
    res.redirect('/pageNotFound') 
  }
}

module.exports={
  loadwallet,
  loadwalletHistory
}