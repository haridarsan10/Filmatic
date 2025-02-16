const Product = require('../../models/productSchema');
const Category=require('../../models/categorySchema')
const User=require('../../models/userSchema')
const Coupon=require('../../models/couponSchema')
const Order=require('../../models/orderSchema')

const loadReturn = async (req, res) => {
  try {
    const returnOrders = await Order.find({ returnReason: { $ne: null }, returnStatus: "pending" })
      .populate('userId', 'name email') 
      .populate('order_items.productId', 'image'); 

    res.render('return-requests', { returnOrders });

  } catch (error) {
    console.log(error);
    res.redirect('/admin/pageError');
  }
};

module.exports = { loadReturn };


module.exports = { loadReturn };
