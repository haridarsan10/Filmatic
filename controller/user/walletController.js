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
    const userId = req.session.user;

    const page = parseInt(req.query.page) || 1; 
    const limit = 5; 
    const skip = (page - 1) * limit;

    const wallet = await Wallet.findOne({ userId: userId });

    if (!wallet || wallet.transactions.length === 0) {
      return res.render('wallet-history', {
        user: userData,
        transactions: [],
        currentPage: page,
        totalPages: 1,
      });
    }

    const sortedTransactions = wallet.transactions.sort((a, b) => new Date(b.date) - new Date(a.date));

    const totalTransactions = sortedTransactions.length;
    const totalPages = Math.ceil(totalTransactions / limit);

    const transactions = sortedTransactions.slice(skip, skip + limit); 

    res.render('wallet-history', {
      user: userData,
      transactions,
      currentPage: page,
      totalPages,
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