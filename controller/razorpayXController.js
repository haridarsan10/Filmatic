const Razorpay = require("razorpay");
require("dotenv").config();
const crypto = require("crypto");
const Order = require("../models/orderSchema"); 
const Cart = require("../models/cartSchema"); 





const razorpayInstance = new Razorpay({
    key_id: process.env.RAZORPAY_KEY_ID,
    key_secret: process.env.RAZORPAY_KEY_SECRET
});

const createOrder = async (req, res) => {
    try {
      const { amount, currency } = req.body;
      if (!amount || isNaN(amount) || amount <= 0) {
          return res.status(400).json({ success: false, message: "Invalid amount" });
      }        
      const options = {
            amount: amount * 100, // Convert to paisa
            currency,
            receipt: `order_rcptid_${Date.now()}`,
            payment_capture: 1,
            
        };

        const order = await razorpayInstance.orders.create(options);
        res.status(200).json({
          success: true,
          order_id: order.id,
          amount: order.amount,
          currency: order.currency,
          key: process.env.RAZORPAY_KEY_ID 
      });
    } catch (error) {
        console.error("Error creating order:", error);
        res.status(500).json({ success: false, error: "Failed to create order" });
    }
};

const verifyPayment = async (req, res) => {
  try {
      console.log("Received req.body:", req.body); // Debugging log

      const { razorpay_order_id, razorpay_payment_id, razorpay_signature, addressId, totalPrice, cartItems, couponCode } = req.body;

      // Ensure userId is extracted from session or request (depending on your authentication method)
      const userId = req.session?.userId || req.body.userId; // Adjust this based on your auth system

      if (!userId || !addressId || !totalPrice || !cartItems || cartItems.length === 0) {
          return res.status(400).json({ success: false, message: "Missing required order details" });
      }

      const generatedSignature = crypto.createHmac("sha256", process.env.RAZORPAY_KEY_SECRET)
          .update(`${razorpay_order_id}|${razorpay_payment_id}`)
          .digest("hex");

      if (generatedSignature !== razorpay_signature) {
          return res.status(400).json({ success: false, message: "Payment verification failed" });
      }

      // Map cartItems to match order schema
      const order_items = cartItems.map(item => ({
          productId: item.productId,
          productName: item.productName || "Unknown Product", // Ensure a name exists
          price: item.price,
          quantity: item.quantity
      }));

      const newOrder = new Order({
          userId,
          address_id: addressId,
          payment_method: "upi", // Assuming UPI for now; adjust based on real data
          order_items,
          total: totalPrice,
          discount: 0, // Adjust if applicable
          finalAmount: totalPrice, // Adjust if using discounts
          couponApplied: couponCode || false,
          status: "processing"
      });

      await newOrder.save();
      res.json({ success: true, message: "Order placed successfully", orderId: newOrder._id });

  } catch (error) {
      console.error("Payment Verification Error:", error);
      res.status(500).json({ success: false, message: "Failed to verify payment" });
  }
};



module.exports = { 
    verifyPayment,
    createOrder 
};