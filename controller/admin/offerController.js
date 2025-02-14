const Product = require('../../models/productSchema');
const Category=require('../../models/categorySchema')
const User=require('../../models/userSchema')
const Coupon=require('../../models/couponSchema')


const addOffer = async (req, res) => {
  try {
    const { productId, offer, endDate } = req.body;

    const productData=await Product.findOne({_id:productId})

    if(!productData){
      res.status(404).json({success:false,message:"Product not found"})
    }

    productData.offer=offer
    productData.offerEndDate=endDate

    await productData.save()

    return res.status(200).json({success:true,message:"Offer added successfully"})

  } catch (error) {
    console.log(error);
    res.status(500).json({ success: false, message: "Something went wrong, please try again later." });
  }
};

const removeOffer=async (req,res) => {
  try {
    const {productId}=req.body

    if(!productId){
      res.status(404).json({success:false,message:"Product id not found"})
    }
    
    const productData=await Product.findOne({_id:productId})

    if(!productData){
      res.status(404).json({success:false,message:"Product not found"})
    }

        await Product.updateOne(
          { _id: productId },
          {
            $unset: {
              offer: "",
              offerStartDate: "",
              offerEndDate:""
            }
          }
        );
    
        return res.status(200).json({ success: true, message: "Offer removed successfully" });
    
  } catch (error) {
    console.log(error);
    res.status(500).json({ success: false, message: "Something went wrong, please try again later." });
  }
}

const addCatOffer = async (req, res) => {
  try {
    const { categoryId, offer, endDate } = req.body;

    if (!categoryId || !offer || !endDate) {
      return res.status(400).json({ success: false, message: "Missing required fields." });
    }

    const categoryData = await Category.findOne({ _id: categoryId });

    if (!categoryData) {
      return res.status(404).json({ success: false, message: "Category not found" });
    }

    categoryData.categoryOffer = offer;
    categoryData.categoryOfferEndDate = endDate;

    await categoryData.save();

    return res.status(200).json({ success: true, message: "Offer added successfully" });

  } catch (error) {
    console.log(error);
    return res.status(500).json({ success: false, message: "Something went wrong, please try again later." });
  }
};

const removeCatOffer = async (req, res) => {
  try {
    const { categoryId } = req.body;

    if (!categoryId) {
      return res.status(400).json({ success: false, message: "Category ID is required." });
    }

    const categoryData = await Category.findOne({ _id: categoryId }); // Fixed Model

    if (!categoryData) {
      return res.status(404).json({ success: false, message: "Category not found" });
    }

    await Category.updateOne(
      { _id: categoryId },
      {
        $unset: {
          categoryOffer: "",
          categoryOfferStartDate: "",
          categoryOfferEndDate: ""
        }
      }
    );

    return res.status(200).json({ success: true, message: "Offer removed successfully" });

  } catch (error) {
    console.log(error);
    return res.status(500).json({ success: false, message: "Something went wrong, please try again later." });
  }
};



module.exports={
  addOffer,
  removeOffer,
  addCatOffer,
  removeCatOffer
}