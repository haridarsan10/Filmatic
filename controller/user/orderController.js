const User=require('../../models/userSchema')
const Address=require('../../models/addressSchema')
const Product=require('../../models/productSchema')
const Category=require('../../models/categorySchema')
const Cart=require('../../models/cartSchema')
const Order=require('../../models/orderSchema')
const Coupon=require('../../models/couponSchema')

const mongoose=require('mongoose')


const loadOrders = async (req, res) => {
  try {
    const userData = req.session.userData;
    const userId = req.session.user;

    let page=parseInt(req.query.page) || 1
    let limit=5
    let skip=(page-1)*limit

    const totalOrders = await Order.countDocuments({ userId: userId });
    const totalPages = Math.ceil(totalOrders / limit);  // Calculate total page

    const userOrders = await Order.find({ userId: userId })
      .populate({
        path: 'order_items.productId',
        select: 'productImage' 
      })
      .skip(skip)
      .limit(limit)
      .sort({createdAt:-1})

    const ordersData = userOrders.map(order => ({
      orderId: order.orderId,
      status: order.status,
      total: order.total,
      image: order.order_items.length > 0 && order.order_items[0].productId 
        ? order.order_items[0].productId.productImage[0] || 'default.jpg' 
        : 'default.jpg'
    }));

    res.render('orders', { user: userData, orders: ordersData,currentPage: page,totalPages: totalPages  });

  } catch (error) {
    console.log(error);
    res.redirect('/pageNotFound');
  }
};


const orders=async (req,res) => {
  try {
    const {addressId,paymentMethod,totalPrice,cartItems,couponCode }=req.body
    const userId=req.session.user
    // console.log(req.body)

    const discount = req.body.discount || 0;  
    const finalAmount = req.body.finalAmount || totalPrice;  
    const couponApplied = req.body.couponApplied || false;  


    if (couponCode && couponCode !== 'null') {
      const coupon = await Coupon.findOne({ code: couponCode });

      coupon.usageLimit -= 1;
      await coupon.save();  
    }


      const newOrder=new Order({
        userId:userId, 
        address_id: addressId,
        payment_method: paymentMethod,
        order_items: cartItems.map(item => ({
          productId: item.productId._id,  
          productName: item.productId.productName, 
          price: item.price, 
          quantity: item.quantity, 
          totalPrice: item.totalPrice 
        })),
        total: totalPrice,
        status:"pending",
        discount: discount,
        finalAmount: finalAmount, 
        couponApplied: couponApplied 
      })

      await newOrder.save()

      for (let item of cartItems) { 
        await Product.findByIdAndUpdate(
            item.productId._id, 
            { $inc: { quantity: -item.quantity } }  // Decrease stock
        );
    }      

    return res.status(200).json({ success: true, message: "Order Placed successfully" });

  } catch (error) {
    res.redirect('/pageNotFound')
    console.log(error)
  }
}

  const loadOrderDetails = async (req, res) => {
    try {

      const userData = req.session.userData;
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
          productName: item.productId.productName,
          price: item.price,
          quantity: item.quantity,
          total: item.price * item.quantity
        }));

        console.log(products)

      res.render('order-details',{ user:userData,products:products,order:order,address:foundAddress})

    } catch (error) {
      console.log("Error fetching order details:", error);
      res.status(500).send("Internal Server Error");
    }
  };


const cancelOrder=async (req,res) => {
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


module.exports={
  orders,
  loadOrders,
  loadOrderDetails,
  cancelOrder
}