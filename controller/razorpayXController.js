const Razorpay = require("razorpay");
const crypto = require("crypto");
const mongoose = require("mongoose");
const Order = require("../models/orderSchema"); 
const Cart = require("../models/cartSchema"); 
const Product = require("../models/productSchema"); 


const razorpayInstance = new Razorpay({
    key_id: process.env.RAZORPAY_KEY_ID,
    key_secret: process.env.RAZORPAY_KEY_SECRET
});

// Create Razorpay Order
const createOrder = async (req, res) => {
    try {
        const { amount, currency = "INR" } = req.body;

        if (!amount || isNaN(amount) || amount <= 0) {
            return res.status(400).json({ success: false, message: "Invalid amount" });
        }

        const options = {
            amount: Math.round(amount * 100),
            currency,
            receipt: `order_rcptid_${Date.now()}`,
            payment_capture: 1
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
        res.status(500).json({ success: false, message: "Failed to create order", error: error.message });
    }
};

        const verifyPayment = async (req, res) => {
            try {
                console.log("Received Payment Data:", req.body);

                const { 
                    razorpay_order_id, 
                    razorpay_payment_id, 
                    razorpay_signature,
                    addressId,
                    totalPrice,
                    cartItems,
                    couponCode,
                    discountAmount
                } = req.body;

                if (!razorpay_order_id) {
                    return res.status(400).json({ success: false, message: "Missing Razorpay order ID" });
                }

                let paymentStatus = "failed"; 
                let status="failed"

                if (razorpay_payment_id && razorpay_signature) {

                    const generatedSignature = crypto
                        .createHmac("sha256", process.env.RAZORPAY_KEY_SECRET)
                        .update(`${razorpay_order_id}|${razorpay_payment_id}`)
                        .digest("hex");

                    if (generatedSignature !== razorpay_signature) {
                        return res.status(400).json({ success: false, message: "Invalid payment signature" });
                    }

                    paymentStatus = "success"; 
                    status="pending"
                }

                const formattedCartItems = cartItems.map(item => ({
                    productId: new mongoose.Types.ObjectId(item.productId),
                    productName: item.productName || "Unknown Product",
                    quantity: item.quantity,
                    price: item.price
                }));

                const couponApplied = couponCode ? true : false;

                const newOrder = new Order({
                    userId: req.session.user,
                    address_id: new mongoose.Types.ObjectId(addressId),
                    payment_method: "razorpay",
                    order_items: formattedCartItems,
                    total: totalPrice,
                    finalAmount: totalPrice - discountAmount,
                    couponApplied,
                    couponCode,
                    discount: discountAmount,
                    paymentStatus,
                    status,
                    razorpayOrderId: razorpay_order_id,
                    razorpayPaymentId: razorpay_payment_id || null 
                });

                await newOrder.save();

                if (paymentStatus === "success") {
                    await Cart.findOneAndUpdate(
                        { userId: req.session.userId },
                        { $set: { items: [], cartTotal: 0 } }
                    );
                }

                return res.status(200).json({
                    success: true,
                    message: `Order placed with payment status: ${paymentStatus}`,
                    orderId: newOrder._id
                });

            } catch (error) {
                console.error("Payment Verification Error:", error);
                res.status(500).json({
                    success: false,
                    message: error.message || "Payment verification failed"
                });
            }
        };




        const retryPayment = async (req, res) => {
            try {
                console.log("Received Retry Payment Request:", req.body);
        
                const { orderId } = req.body;
        
                if (!orderId) {
                    return res.status(400).json({ success: false, message: "Missing Order ID" });
                }
        
                const order = await Order.findById(orderId);
                if (!order) {
                    return res.status(404).json({ success: false, message: "Order not found." });
                }
        
                if (order.paymentStatus !== "failed") {
                    return res.status(400).json({ success: false, message: "Order is not eligible for retry." });
                }
        
                const newOrder = await razorpayInstance.orders.create({
                    amount: order.finalAmount * 100,  
                    currency: "INR",
                    receipt: `retry_${orderId}`,
                });
        
                return res.status(200).json({
                    success: true,
                    key_id: process.env.RAZORPAY_KEY_ID,
                    amount: newOrder.amount,
                    currency: newOrder.currency,
                    razorpay_order_id: newOrder.id,  
                    orderId: order._id,
                    email: order.userEmail,
                });
        
            } catch (error) {
                console.error("Retry Payment Error:", error);
                return res.status(500).json({ success: false, message: "Error processing retry payment." });
            }
        };
        



        const verifyRetrypayment = async (req, res) => {
            try {
                console.log("Verifying Payment:", req.body);
        
                const { razorpay_order_id, razorpay_payment_id, razorpay_signature, orderId } = req.body;
        
                if (!razorpay_order_id || !razorpay_payment_id || !razorpay_signature || !orderId) {
                    return res.status(400).json({ success: false, message: "Missing required payment details." });
                }
        
                const generatedSignature = crypto
                    .createHmac("sha256", process.env.RAZORPAY_KEY_SECRET)
                    .update(`${razorpay_order_id}|${razorpay_payment_id}`)
                    .digest("hex");
        
                if (generatedSignature !== razorpay_signature) {
                    console.error("Invalid Payment Signature:", { razorpay_order_id, razorpay_payment_id });
                    return res.status(400).json({ success: false, message: "Invalid payment signature" });
                }
        
                const order = await Order.findById(orderId);
                if (!order) {
                    return res.status(404).json({ success: false, message: "Order not found." });
                }
        
                order.paymentStatus = "success";
                order.status = "pending";
                await order.save();
        
                await Cart.findOneAndUpdate(
                    { userId: order.userId },
                    { $set: { items: [], cartTotal: 0 } }
                );
        
                return res.status(200).json({ success: true, message: "Payment verified successfully." });
        
            } catch (error) {
                console.error("Payment Verification Error:", error);
                return res.status(500).json({ success: false, message: "Payment verification failed." });
            }
        };
        
        
    

module.exports = { verifyPayment, createOrder,retryPayment,verifyRetrypayment };
