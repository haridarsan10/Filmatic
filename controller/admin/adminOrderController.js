const Product = require('../../models/productSchema');
const Category=require('../../models/categorySchema')
const User=require('../../models/userSchema')
const fs = require('fs');
const Order=require('../../models/orderSchema')
const Address=require('../../models/addressSchema')


const loadOrders=async (req,res) => {
  try {
    
      const userOrders = await Order.find()
      .populate({
        path: 'order_items.productId',
        select: 'productImage' 
      });

    const ordersData = userOrders.map(order => ({
      orderId: order.orderId,
      status: order.status,
      total: order.total,
      image: order.order_items.length > 0 && order.order_items[0].productId 
        ? order.order_items[0].productId.productImage[0] || 'default.jpg' 
        : 'default.jpg'
    }));

    res.render('admin-order',{orders:ordersData})
   

  } catch (error) {
    console.log(error)
    res.redirect('/pageError')
  }
}

const orderDetails = async (req, res) => {
  try {
    const orderId = req.query.id.trim(); 

    const order = await Order.findOne({ orderId })
      .populate('order_items.productId', 'productName productImage') 
      .exec();


      // console.log(order)

      const addressId=order.address_id.toString()

      const address = await Address.findOne({
        "address._id": addressId
      }).select("address.$");  
      
      const foundAddress = address?.address[0] || {}; 

      const products = order.order_items.map(item => ({
        productImage: item.productId?.productImage || 'default-image.jpg', 
        productName: item.productName,
        price: item.price,
        quantity: item.quantity,
        total: item.price * item.quantity
      }));


    res.render('admin-order-details',{products:products,order:order,address:foundAddress})

  } catch (error) {
    console.log("Error fetching order details:", error);
    res.status(500).send("Internal Server Error");
  }
};



module.exports={
  loadOrders,
  orderDetails
}