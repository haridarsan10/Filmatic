const Product = require('../../models/productSchema');
const Category=require('../../models/categorySchema')
const User=require('../../models/userSchema')
const fs = require('fs');
const Order=require('../../models/orderSchema')
const Address=require('../../models/addressSchema')


const loadOrders = async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1; 
    const limit = 5; 
    const skip = (page - 1) * limit;

    const totalOrders = await Order.countDocuments(); 
    const totalPages = Math.ceil(totalOrders / limit);

    const userOrders = await Order.find({status:{$ne:"failed"}})
      .populate({
        path: 'order_items.productId',
        select: 'productImage',
      })
      .sort({ createdAt: -1 }) 
      .skip(skip)
      .limit(limit);


    const ordersData = userOrders.map((order) => ({
      orderId: order.orderId,
      status: order.status,
      total: order.finalAmount,
      image:
        order.order_items.length > 0 && order.order_items[0].productId
          ? order.order_items[0].productId.productImage[0] || 'default.jpg'
          : 'default.jpg',
    }));

    res.render('admin-order', {
      orders: ordersData,
      currentPage: page,
      totalPages,
    });
  } catch (error) {
    console.log(error);
    res.redirect('/pageError');
  }
};

const orderDetails = async (req, res) => {
  try {
    const orderId = req.query.id.trim(); 

    const order = await Order.findOne({ orderId })
      .populate('order_items.productId', 'productName productImage') 
      .exec();


      const addressId=order.address_id.toString()

      const address = await Address.findOne({
        "address._id": addressId
      }).select("address.$");  
      

      const foundAddress = address?.address[0] || {}; 


      const products = order.order_items.map(item => ({
        productImage: item.productId?.productImage || 'default-image.jpg', 
        productName: item.productId.productName,
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


const adminCancelOrder=async (req,res) => {
  try {
    const orderId = req.body.orderId.trim(); 
      // console.log(orderId);
    
      if (!orderId) {
        return res.json({ success: false, message: "Invalid Order ID." });
      }

      const order = await Order.findOne({ orderId: orderId });

      if (!order) {
        return res.json({ success: false, message: "Order not found." });
      }
      
      const updateResult=await Order.updateOne({orderId},{$set:{status:"cancelled"}})

      if (updateResult.modifiedCount > 0) {
        return res.json({ success: true, message: "Order cancelled successfully." });
      } else {
        return res.json({ success: false, message: "Order status update failed." });
      }

  } catch (error) {
    console.log(error)
    res.status(500).json({success:false,message:"Some error occured"})
  } 
}

const updateOrderStatus = async (req, res) => {
  try {
      const { orderId, newStatus } = req.body;
      console.log("Received Order ID:", orderId, "New Status:", newStatus);

      const allowedStatuses = ['pending', 'shipped', 'delivered'];
      if (!allowedStatuses.includes(newStatus)) {
          return res.status(400).json({ success: false, message: "Invalid status for admin action." });
      }

      const order = await Order.findOne({ orderId });
      if (!order) {
          return res.status(404).json({ success: false, message: "Order not found." });
      }

      if (order.status === 'cancelled' || order.status === 'returned') {
          return res.status(400).json({ success: false, message: `Cannot update status of a ${order.status} order.` });
      }

      order.status = newStatus;

      if (newStatus === 'delivered') {
          order.order_items.forEach(item => {
              if (item.itemStatus !== 'cancelled') {
                  item.itemStatus = 'delivered';
              }
          });
      }

      await order.save();

      res.json({ success: true, message: "Order status updated successfully." });
  } catch (error) {
      console.error("Error updating order status:", error);
      res.status(500).json({ success: false, message: "Internal server error." });
  }
};




module.exports={
  loadOrders,
  orderDetails,
  adminCancelOrder,
  updateOrderStatus

}