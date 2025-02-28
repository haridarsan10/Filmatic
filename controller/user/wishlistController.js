const User=require('../../models/userSchema')
const Address=require('../../models/addressSchema')
const Product=require('../../models/productSchema')
const Category=require('../../models/categorySchema')
const Cart=require('../../models/cartSchema')
const WishList=require('../../models/wishlistSchema')
const { calculateFinalPrice } = require('../../helpers/priceHelper');


const mongoose=require('mongoose')

const loadWishlist = async (req, res) => {
  try {
    const userId = req.session.user;
    const userData = req.session.userData;

    const wishlistData = await WishList.findOne({ userId: userId })
      .populate({
        path: "items.productId",
        populate: { path: "category" } 
      });

    if (!wishlistData) {
      return res.render('wishlist', { user: userData, wishlist: null });
    }

    const updatedWishlist = {
      ...wishlistData.toObject(),
      items: wishlistData.items
        .filter(item => item.productId)  
        .map(item => {
          const { finalPrice, bestOffer } = calculateFinalPrice(item.productId);
          return {
            ...item.toObject(),
            productId: {
              ...item.productId.toObject(),
              pricing: {
                finalPrice,
                bestOffer
              }
            }
          };
        })
    };
    

    res.render('wishlist', { user: userData, wishlist: updatedWishlist });

  } catch (error) {
    console.log(error);
    res.redirect('/pageNotFound');
  }
};


const addToWishlist=async(req,res)=>{
  try {

    const {productId}=req.body
    console.log(req.body)
    const userId=req.session.user
  
    if (!userId) {
      return res.status(401).json({ success: false, redirectUrl: "/login" });
    }

    const productData = await Product.findOne({ _id: productId, isBlocked: false });

    if (!productData) {
      return res.status(404).json({ success: false, message: "Product not found" });
    }

    let wishlist = await WishList.findOne({ userId });

    if (!wishlist) {
      wishlist = new WishList({ userId, items: [{ productId }] });
    }else{
      const exists = wishlist.items.some(item => item.productId.toString() === productId.toString());

      if (!exists) {
        wishlist.items.push({ productId });
      }
    }

    await wishlist.save();
    return res.json({ success: true, message: "Added to wishlist" });
    
  } catch (error) {
    console.error("Error adding to cart:", error);
    return res.status(500).json({ success: false, message: "Internal Server Error" });
  }
}


const removeWishlist = async (req, res) => {
  try {
    const { productId } = req.body;
    const userId = req.session.user;

    const wishlist = await WishList.findOne({ userId });

    if (!wishlist) {
      return res.status(404).json({ success: false, message: "Wishlist not found" });
    }

    await WishList.updateOne(
      { userId: userId },
      { $pull: { items: { productId: productId } } }
    );

    return res.status(200).json({ success: true, message: "Item removed from Wishlist" });

  } catch (error) {
    console.error("Error removing from wishlist:", error);
    return res.status(500).json({ success: false, message: "Internal Server Error" });
  }
};


module.exports={
  addToWishlist,
  loadWishlist,
  removeWishlist
}