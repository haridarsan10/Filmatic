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
                console.log(req.session.user); // Check its structure
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


                console.log(req.body)

                // Validate required fields
                if (!razorpay_order_id || !razorpay_payment_id || !razorpay_signature) {
                    return res.status(400).json({
                        success: false,
                        message: "Missing payment verification parameters"
                    });
                }

                // Verify Razorpay signature
                const generatedSignature = crypto
                    .createHmac("sha256", process.env.RAZORPAY_KEY_SECRET)
                    .update(`${razorpay_order_id}|${razorpay_payment_id}`)
                    .digest("hex");

                if (generatedSignature !== razorpay_signature) {
                    return res.status(400).json({
                        success: false,
                        message: "Invalid payment signature"
                    });
                }

                // Validate and transform cart items
                const formattedCartItems = cartItems.map(item => {
                    if (!item.productId || typeof item.productId !== "string") {
                        throw new Error("Invalid productId format");
                    }

                    

                    return {
                        productId: new mongoose.Types.ObjectId(item.productId),
                        productName: item.productName || "Unknown Product",
                        quantity: item.quantity,
                        price: item.price
                    };
                });

                const couponApplied=couponCode ? true:false

                
                // Create order object
                const newOrder = new Order({
                    userId: req.session.user,
                    address_id: new mongoose.Types.ObjectId(addressId), // Ensure address is ObjectId
                    payment_method: 'razorpay',
                    order_items: formattedCartItems,
                    total: totalPrice,
                    finalAmount:totalPrice-discountAmount,
                    couponApplied,
                    couponCode,
                    discountAmount
                });

                await newOrder.save();

                // Clear cart after successful order
                await Cart.findOneAndUpdate(
                    { userId: req.session.userId },
                    { $set: { items: [], cartTotal: 0 } }
                );

                res.status(200).json({
                    success: true,
                    message: "Order placed successfully",
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


module.exports = { verifyPayment, createOrder };
