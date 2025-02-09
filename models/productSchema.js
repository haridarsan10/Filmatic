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
    required:false
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
  }
})

const Product=mongoose.model("Product",productSchema)

module.exports=Product