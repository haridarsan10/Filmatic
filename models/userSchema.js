const mongoose=require('mongoose')
const {Schema}=mongoose;
const bcrypt=require('bcrypt')

const userSchema=new mongoose.Schema({
  name:{
    type:String,
    required:true
  },
  email:{
    type:String,
    required:true,
    unique: true
  },
  phone:{
    type:Number,
    required:false,
    unique: true,
    sparse:true,
    default:null  
  },
  password:{
    type:String,
    required:false
  },
  isBlocked:{
    type:Boolean,
    default:false
  },
  isAdmin:{
    type:Boolean,
    default:false
  },
  referralCode: {
    type: String,
    required: true,
    unique: true
  },
  referredBy: {          
    type: String,
    required: false,
    default: null      
  },
  googleId: {
    type: String,
    required: false, 
    unique: true,
    sparse: true
  },
})

const User=mongoose.model("User",userSchema)

module.exports=User;