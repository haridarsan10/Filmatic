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
        total: item.price * item.quantity,
        itemStatus:item.itemStatus,
        productId:item.productId._id
      }));

      console.log(products)
            


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
      const { orderId, productId, newStatus } = req.body;

      console.log("Received Order ID:", orderId, "Product ID:", productId, "New Status:", newStatus);

      const allowedStatuses = [
          'ordered', 
          'cancelled', 
          'returned', 
          'delivered', 
          'returnRequested', 
          'returnRejected'
      ];

      if (!allowedStatuses.includes(newStatus)) {
          return res.status(400).json({ success: false, message: "Invalid item status." });
      }

      const order = await Order.findOne({ orderId });
      if (!order) {
          return res.status(404).json({ success: false, message: "Order not found." });
      }

      const product = order.order_items.find(item => item.productId.toString() === productId);

      if (!product) {
          return res.status(404).json({ success: false, message: "Product not found in this order." });
      }

      if (product.itemStatus === 'cancelled' || product.itemStatus === 'returned') {
          return res.status(400).json({ success: false, message: `Cannot update status of a ${product.itemStatus} item.` });
      }

      product.itemStatus = newStatus;

      if (newStatus === 'returnRequested' && req.body.returnReason) {
          product.returnReason = req.body.returnReason;
      }

      await updateOverallOrderStatus(order);

      await order.save();

      res.json({ success: true, message: "Product item status updated successfully." });

  } catch (error) {
      console.error("Error updating product item status:", error);
      res.status(500).json({ success: false, message: "Internal server error." });
  }
};

const updateOverallOrderStatus = (order) => {
    const itemStatuses = order.order_items.map(item => item.itemStatus);
    
    if (itemStatuses.every(status => status === 'delivered')) {
        order.status = 'delivered';
    } else if (itemStatuses.every(status => status === 'cancelled')) {
        order.status = 'cancelled';
    } else if (itemStatuses.every(status => status === 'returned')) {
        order.status = 'returned';
        
        order.returnStatus = 'completed';
    } else if (itemStatuses.some(status => status === 'returnRequested')) {
        order.returnStatus = 'pending';
    }
    
    const hasDelivered = itemStatuses.some(status => status === 'delivered');
    const allOthersCancelledOrReturned = itemStatuses.every(status => 
        status === 'delivered' || status === 'cancelled' || status === 'returned'
    );
    
    if (hasDelivered && allOthersCancelledOrReturned) {
        order.status = 'delivered'; 
    }
    
    if (itemStatuses.some(status => status === 'returned')) {
        if (order.refundStatus === 'not processed') {
            order.refundStatus = 'processing';
        }
    }
    
    return order;
};





module.exports={
  loadOrders,
  orderDetails,
  adminCancelOrder,
  updateOrderStatus

}