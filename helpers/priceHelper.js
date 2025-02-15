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

module.exports={
  calculateFinalPrice
}
