const mongoose=require('mongoose')
const {Schema}=mongoose;

const couponSchema = new mongoose.Schema({
  code: {
    type: String,
    required: true,
    unique: true,
    uppercase: true, 
    trim: true
  },
  discount: {
    type: Number,
    required: true,
  },
  discountType: {
    type: String,
    enum: ['percentage'],
    default:"percentage"
  },
  minPurchase: {
    type: Number,
    default: 0
  },
  maxDiscount: {
    type: Number, 
    default: null
  },
  validFrom: {
    type: Date,
    required: true
  },
  validTo: {
    type: Date,
    required: true
  },
  usageLimit: {
    type: Number, 
    default: 1
  },
  isActive: {
    type: Boolean,
    default: true
  }
});


const Coupon=mongoose.model("Coupon",couponSchema)
module.exports=Coupon;