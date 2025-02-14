const mongoose=require('mongoose')
const {Schema}=mongoose;
const bcrypt=require('bcrypt')

const categorySchema = new mongoose.Schema({
   name:{
      type: String,
      required: true
   },
   description:{
      type: String,
      required: true
   },
   // categoryOffer:{
   //    type: Number,
   //    default: 0
   // },
   isListed:{
      type: Boolean,
      default: true
   },
   createdAt:{
      type: Date,
      default: Date.now
   },
   categoryOffer: { 
      type: Number,
      required: false,
      default: null
    },
    categoryOfferStartDate: { 
      type: Date,
      required: false,
      default: Date.now
    },
    categoryOfferEndDate: { 
      type: Date,
      required: false,
      default: null
    },
})
const category = mongoose.model('Category', categorySchema);

module.exports =category;

