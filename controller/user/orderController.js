const User=require('../../models/userSchema')
const Address=require('../../models/addressSchema')
const Product=require('../../models/productSchema')
const Category=require('../../models/categorySchema')
const Cart=require('../../models/cartSchema')
const Order=require('../../models/orderSchema')

const mongoose=require('mongoose')


const loadOrders=async (req,res) => {
  try {
    const userData=req.session.userData

    const userOrders=await Order({})

    res.render('orders',{user:userData})
  } catch (error) {
    
  }
}

const orders=async (req,res) => {
  try {
    const {addressId,paymentMethod,totalPrice,cartItems}=req.body
    const userId=req.session.user
    // console.log(req.body)

    const discount = req.body.discount || 0;  
    const finalAmount = req.body.finalAmount || totalPrice;  
    const couponApplied = req.body.couponApplied || false;  


    // console.log(cartItems)

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

    return res.status(200).json({ success: true, message: "Order Placed successfully" });

  } catch (error) {
    res.redirect('/pageNotFound')
    console.log(error)
  }
}

module.exports={
  orders,
  loadOrders
}