const User=require('../../models/userSchema')
const Address=require('../../models/addressSchema')
const Product=require('../../models/productSchema')
const Category=require('../../models/categorySchema')
const Cart=require('../../models/cartSchema')
const WishList=require('../../models/wishlistSchema')
const Wallet = require('../../models/walletSchema');


const loadwallet = async (req, res) => {
  try {
    const userData = req.session.userData;
    const userId=req.session.user
    const wallet = await Wallet.findOne({ userId: userId });

    res.render('wallet', {
      user: userData,
      balance: wallet ? wallet.balance : 0, 
    });

  } catch (error) {
    console.log(error);
    res.redirect('/pageNotFound');
  }
};



const loadwalletHistory = async (req, res) => {
  try {
    const userData = req.session.userData;
    const userId=req.session.user

    const wallet = await Wallet.findOne({ userId: userId });

    res.render('wallet-history', {
      user: userData,
      transactions: wallet ? wallet.transactions : [], 
    });

  } catch (error) {
    console.log(error);
    res.redirect('/pageNotFound');
  }
};



module.exports={
  loadwallet,
  loadwalletHistory
}