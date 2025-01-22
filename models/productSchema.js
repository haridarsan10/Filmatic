const mongoose=require("mongoose")
const {Schema}=mongoose;

const productSchema=new Schema({
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
    ref:"Category",
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
  productOffer:{
    type:Number,
    default:0,
  },
  quantity:{
    type:Number,
    default:true
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
    default:"Available"
  }
})

const Product=mongoose.Model("Product",productSchema)

module.exports=Product