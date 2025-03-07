const User=require('../../models/userSchema')
const Address=require('../../models/addressSchema')
const Product=require('../../models/productSchema')
const Category=require('../../models/categorySchema')
const Cart=require('../../models/cartSchema')
const mongoose=require('mongoose')
const { calculateFinalPrice } = require('../../helpers/priceHelper');



const loadCart = async (req, res) => {
  try {
      const userId = req.session.user;
      const userData = req.session.userData;

      const cartData = await Cart.findOne({ userId: userId }).populate("items.productId");

      if (!cartData) {
          return res.render('cart', { user: userData, cartData: { items: [] } });
      }

      cartData.items = cartData.items.map(item => {
          const product = item.productId;

          item.outOfStock = product.quantity <= 0;  
          return item;
      });

      res.render('cart', { user: userData, cartData: cartData });

  } catch (error) {
      console.log("Error loading cart:", error);
      res.redirect('/pageNotFound');
  }
}


const addToCart = async (req, res) => {
  try {
    const { productId, quantity } = req.body;
    const userId = req.session.user;

    if (!userId) {
      return res.json({ success: false, redirectUrl: '/login' });
    }

    const productData = await Product.findOne({ _id: productId, isBlocked: false }).populate('category')

      // console.log(productData)

    if (!productData) {
      return res.status(404).json({ success: false, message: "Product does not exist" });
    }

     if (productData.quantity <= 0) {
      return res.status(400).json({ success: false, message: "Out of stock" });
    }


    const itemQuantity = parseInt(quantity) || 1;

    let cartData = await Cart.findOne({ userId });

    if (!cartData) {
      cartData = new Cart({
        userId,
        items: [],
        cartTotal: 0
      });
      await cartData.save();  // Save immediately to avoid data loss
    }

    const existingItem = cartData.items.find(item => item.productId.toString() === productId.toString());

    if (existingItem) {
      let newQuantity = existingItem.quantity + itemQuantity;

      if (newQuantity > 5) {
        return res.status(400).json({ success: false, message: "You can only buy 5 items" });
      }

      if (newQuantity < 1) {
        return res.status(400).json({ success: false, message: "You should order at least 1 quantity" });
      }

      if (newQuantity > productData.quantity) {
        return res.status(400).json({ success: false, message: "You cannot add more than available stock" });
      }

      const { finalPrice, bestOffer } = calculateFinalPrice(productData);

      existingItem.quantity = newQuantity;
      existingItem.totalPrice = newQuantity * finalPrice;
    } else {

      const { finalPrice, bestOffer } = calculateFinalPrice(productData);

      cartData.items.push({
        productId,
        quantity: itemQuantity,
        price: finalPrice,
        totalPrice: finalPrice * itemQuantity
      });
    }

    // Update cart total
    cartData.cartTotal = cartData.items.reduce((total, item) => total + (Number(item.totalPrice) || 0), 0);

    await cartData.save();

    return res.status(200).json({
      success: true,
      message: "Product added to cart successfully",
      cartTotal:cartData.cartTotal
    });

  } catch (error) {
    console.error("Error adding to cart:", error);
    res.status(500).json({ success: false, message: "Failed to add item to the cart" });
  }
};


const deleteItem = async (req, res) => {
  try {
    const { productId } = req.body;
    const userId = req.session.user;
    const productObjectId = new mongoose.Types.ObjectId(productId);

    // Directly remove the item
    await Cart.updateOne(
      { userId: userId },
      { $pull: { items: { productId: productObjectId } } }
    );

    // Fetch updated cart
    const cartData = await Cart.findOne({ userId }).populate("items.productId");

    if (!cartData) {
      return res.status(404).json({ success: false, message: "Cart not found" });
    }

    // Update cart total
    cartData.cartTotal = cartData.items.length > 0
      ? cartData.items.reduce((total, item) => total + (Number(item.totalPrice) || 0), 0)
      : 0;

    await cartData.save();

    return res.status(200).json({ success: true, message: "Item removed from cart" ,cartTotal:cartData.cartTotal});
  } catch (error) {
    console.error("Error deleting item:", error);
    res.status(500).json({ success: false, message: "Failed to delete item" });
  }
};



module.exports={
  loadCart,
  addToCart,
  deleteItem
}