function calculateFinalPrice(product) {
  const currentDate = new Date();

  let productOffer = (product.offer && product.offerStartDate <= currentDate && 
                      (!product.offerEndDate || product.offerEndDate >= currentDate)) 
                      ? product.offer 
                      : 0;

  let categoryOffer = (product.category.categoryOffer && product.category.categoryOfferStartDate <= currentDate && 
                       (!product.category.categoryOfferEndDate || product.category.categoryOfferEndDate >= currentDate)) 
                       ? product.category.categoryOffer 
                       : 0;

  let bestOffer = Math.max(productOffer, categoryOffer);
  
  let finalPrice = product.regularPrice - (product.regularPrice * bestOffer) / 100;

  return {
      finalPrice: Math.round(finalPrice), 
      bestOffer
  };
}


function calculateRefundAmount(order, productId) {
  const product = order.order_items.find(item => item.productId.toString() === productId);

  if (!product) {
      throw new Error("Product not found in order");
  }

  const productPrice = product.price * product.quantity; 

  if (!order.couponApplied) {
      return productPrice;
  }

  const totalAmount = order.total; 
  const discount = order.discount; 

  const productDiscount = (productPrice / totalAmount) * discount;

  const refundAmount = productPrice - productDiscount;

  return Math.round(refundAmount);
}



module.exports={
  calculateFinalPrice,
  calculateRefundAmount

}
