const mongoose = require('mongoose');
const { Schema } = mongoose
const { v4: uuidv4 } = require('uuid');
const Product = require('./productSchema');

const orderSchema = new Schema({
   orderId: {
      type: String,
      default: () => uuidv4(),
      unique: true
   },
   userId: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true
   },
   address_id: {
      type: Schema.Types.ObjectId,
      ref: "Address",
      required: true
   },
   payment_method: {
      type: String,
      enum: ["credit_card","wallet","cod", "upi"],
      required: true
   },
   order_items: [{
      productId: {
         type: Schema.Types.ObjectId,
         ref: "Product",
         required: true
      },
      productName: {
         type: String,
         required: true,
      },
      price: {
         type: Number,
         required: true
      },
      quantity: {
         type: Number,
         required: true
      }
   }],
   total: {
      type: Number,
      required: true
   },
   discount: {
      type: Number,
      default: 0
   },
   finalAmount: {
      type: Number,
      required: true
   },
   status: {
      type: String,
      enum: ["pending", "processing", "shipped", "delivered", "cancelled", "returned", "refunded"],
      default: "pending"
   },
   invoiceDate: {
      type: Date,
      default: Date.now
   },
   couponApplied: {
      type: String,
      default: false 
   },
}, { timestamps: true });



const Order = mongoose.model('Order', orderSchema);
module.exports = Order;