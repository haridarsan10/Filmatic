const mongoose=require("mongoose")
const {Schema}=mongoose;

const productSchema=new mongoose.Schema({
  productName:{
    type:String,
    required:true,
  },
  description:{
    type:String,
    required:true
  },
  category:{
    type:Schema.Types.ObjectId,
    ref:'Category',
    required:true,
  },
  regularPrice:{
    type:Number,
    required:true,
  },
  salePrice:{
    type:Number,
    required:true,
  },
  // productOffer:{
  //   type:Number,
  //   default:0,
  // },
  quantity:{
    type:Number,
    required:true
  },
  color:{
    type:String,
    required:true
  },
  productImage:{
    type:[String],
    required:true 
  },
  isBlocked:{
    type:Boolean,
    default:false
  },
  status:{
    type:String,
    enum:["In stock","Out of stock","Discontinued"],
    required:true,
    default:"In stock"
  },
  size:{
    type:String,
    enum:["XS","S","M","L","XL","XXL"],
  },
  createdOn: {
    type: Date,
    default: Date.now
  },
  offer: { 
    type: Number,
    required: false,
    default: null
  },
  offerStartDate: { 
    type: Date,
    required: false,
    default: Date.now
  },
  offerEndDate: { 
    type: Date,
    required: false,
    default: null
  },
})

const Product=mongoose.model("Product",productSchema)

module.exports=Product