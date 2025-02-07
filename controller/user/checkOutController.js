const User=require('../../models/userSchema')
const Address=require('../../models/addressSchema')
const Product=require('../../models/productSchema')
const Category=require('../../models/categorySchema')
const Cart=require('../../models/cartSchema')
const mongoose=require('mongoose')


const checkOut = async (req, res) => {
  try {
    const userId = req.session.user;
    const userData = req.session.userData;

    const cartData = await Cart.findOne({ userId: userId }).populate({
      path: "items.productId",
      model: "Product", 
    });

    const cartTotal=cartData.cartTotal

    const addressData = await Address.findOne({ userId: userId });

    if (!userData) {
      return res.render("checkout", { cart: [], address: [] });
    }

    res.render("checkout", {
      user: userData,
      cart: cartData ? cartData.items : [], 
      address: addressData ? addressData.address : [],
      cartTotal
    });

  } catch (error) {
    console.error(error);
    res.redirect("/pageNotFound");
  }
};





module.exports={
  checkOut
}