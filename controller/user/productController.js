const User=require('../../models/userSchema')
const Product=require('../../models/productSchema')
const Category=require('../../models/categorySchema')
const { calculateFinalPrice } = require('../../helpers/priceHelper');


const productDetails=async (req,res) => {
  try {
    const userId=req.session.user
    const userData=await User.findById(userId)
    const productId=req.query.id
    const productData=await Product.findById(productId).populate('category')
    const category=productData.category

    const { finalPrice, bestOffer } = calculateFinalPrice(productData);

    const relatedProducts = await Product.find({
      category: category,
      _id: { $ne: productId } 
  }).limit(4)


    res.render('product-details',{
      user:userData,
      products:productData,
      category:category,
      relatedProducts:relatedProducts,
      finalPrice,
      bestOffer
    })

  } catch (error) {
    console.log(error)
  } 
}


const example=async (req,res) => {
  try {
    res.render('example')
  } catch (error) {
    console.log(error)
  }
}

module.exports={
  productDetails,
  example
}