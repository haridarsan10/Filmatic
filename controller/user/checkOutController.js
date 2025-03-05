const User=require('../../models/userSchema')
const Address=require('../../models/addressSchema')
const Product=require('../../models/productSchema')
const Category=require('../../models/categorySchema')
const Cart=require('../../models/cartSchema')
const Coupon=require('../../models/couponSchema')
const Wallet=require('../../models/walletSchema')

const mongoose=require('mongoose')


  const checkOut = async (req, res) => {
    try {
      const userId = req.session.user;
      const userData = req.session.userData;

      const cartData = await Cart.findOne({ userId: userId }).populate({
        path: "items.productId",
        model: "Product", 
      });

      const cartItems=cartData.items

      const cartTotal=cartData.cartTotal
      const currentDate = new Date();

      const couponData = await Coupon.find({
        minPurchase: { $lte: cartTotal },
        usageLimit: { $gte: 1 },
        isActive: true,
        validFrom: { $lte: new Date() },  
        validTo: { $gte: new Date() }     
    });

      const walletData=await Wallet.findOne(({userId:userId}))
        

      const addressData = await Address.findOne({ userId: userId });

      if (!userData) {
        return res.render("checkout", { cart: [], address: [] });
      }

      res.render("checkout", {
        user: userData,
        cart: cartData ? cartData.items : [], 
        address: addressData ? addressData.address : [],
        cartTotal,
        cartItems,
        couponData,
        walletData
      });

    } catch (error) {
      console.error(error);
      res.redirect("/pageNotFound");
    }
  };





module.exports={
  checkOut
}