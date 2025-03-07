const Product = require('../../models/productSchema');
const Category=require('../../models/categorySchema')
const User=require('../../models/userSchema')
const fs = require('fs');


// const fs=require('fs')
const path=require('path')
const sharp=require('sharp');
const { emitKeypressEvents } = require('readline');
const category = require('../../models/categorySchema');

const geProductsAddPage=async (req,res) => {
  try {

    const category=await Category.find({isListed:true})
    res.render('product-add',{
      category:category
    })

  } catch (error) {
    console.log(error)
    res.redirect('/admin/pageError')
  }
}

const addProducts=async (req,res) => {
  try {

    // console.log(req.body)
    // console.log(req.files)

    const products=req.body
    const productExists=await Product.findOne({
      productName:products.productName
    })

    if(!productExists){
      const images=[]

      if(req.files && req.files.length>0){
        for(let i=0;i<req.files.length;i++){
          const originalImagePath=req.files[i].path;

          const resizedImagePath = path.join(
            'public',
            'uploads',
            'resized-images',
            req.files[i].filename // Create a unique resized file name
          );
          await sharp(originalImagePath).resize({width:440,height:440}).toFile(resizedImagePath)
          images.push(req.files[i].filename)
        }
      }

       if (images.length < 3) {
        return res.status(400).json({ success: false, message: "Minimum three images are required!" });
      }

      const categoryId=await Category.findOne({name:products.category})

      if(!categoryId){
        return res.status(400).send('Invalid category name')
      }

      const newProduct=new Product({
        productName:products.productName,
        description:products.description,
        category:categoryId._id,
        regularPrice:products.regularPrice,
        salePrice:products.salePrice,
        quantity:products.quantity,
        color:products.color,
        productImage:images,
        status:'In stock',
      })

      await newProduct.save()
      return res.status(200).json({ success: true, message: 'Product added Successfully' });
    }
    else{
      return res.status(400).json({ success: false, message: 'Product already exists!' });
     }

  } catch (error) {
    console.log(error)
    return res.redirect('/admin/pageError')
  }
}

const getAllProducts=async (req,res) => {
  try {
    const search=req.query.search || ""
    const page=parseInt(req.query.page) || 1
    const limit=4;

    const productData= await Product.find({
      productName:{$regex:new RegExp(".*"+search+".*",'i')}
    }).sort({createdOn:-1}).limit(limit*1).skip((page-1)*limit).populate('category').exec()

    const count =await Product.find({
      productName:{$regex:new RegExp(".*"+search+".*",'i')}
    }).countDocuments()

    const category=await Category.find({isListed:true});
    
    if(category){
      res.render('products',{
        data:productData,
        currentPage:page,
        totalPages:Math.ceil(count/limit),
        cat:category,

      })
    }
    else{
      res.render('page-404')
    }

  } catch (error) {
   console.log(error),
   res.redirect('/admin/pageError') 
  }
}


const blockProducts=async (req,res) => {
 try {

  const id=req.query.id
  await Product.updateOne({_id:id},{$set:{isBlocked:true}})
  res.redirect('/admin/products')

 } catch (error) {
  console.log(error)
  res.redirect('/admin/pageError')
 }
}

const unblockProducts=async (req,res) => {
  try {
 
   const id=req.query.id
   await Product.updateOne({_id:id},{$set:{isBlocked:false}})
   res.redirect('/admin/products')
 
  } catch (error) {
   console.log(error)
   res.redirect('/admin/pageError')
  }
 }

//  const getEditProduct=async (req,res) => {
//   try {
    
//     const id=req.query.id
//     const product=await Product.findOne({_id:id})
//     const category=await Category.find({})

//     res.render('edit-product',{
//       product:product,
//       category:category
//     })

//   } catch (error) {
//     console.log(error)
//     res.redirect('/admin/pageError')
//   }  
//  }


const getEditProduct=async (req,res) => {
  try {
    const id = req.params.id.trim();
    const product= await Product.findOne({_id:id})
    const category=await Category.find({})


    res.render('edit-product',{
      product:product,
      category:category
    })

  } catch (error) {
    console.log(error)
    res.redirect('/admin/pageError')
  }
}


const editProduct = async (req, res) => {
  try {
      const data = req.body;
      const id = data.productId.trim(); 

      if (!id) {
          return res.status(400).json({ success: false, error: "Invalid product ID" });
      }

      const product = await Product.findById(id);
      if (!product) {
          return res.status(404).json({ success: false, error: "Product not found" });
      }

      const existingProduct = await Product.findOne({
          productName: data.productName,
          _id: { $ne: id } // Ensures we're not checking the same produc
      });

      if (existingProduct) {
          return res.status(400).json({ success: false, error: "Product with this name already exists" });
      }

      // Process and validate images
      const images = [];
      if (req.files && req.files.length > 0) {
          for (let i = 0; i < req.files.length; i++) {
              const originalImagePath = req.files[i].path;

              const resizedImagePath = path.join(
                  "public",
                  "uploads",
                  "resized-images",
                  req.files[i].filename
              );
              await sharp(originalImagePath).resize({ width: 440, height: 440 }).toFile(resizedImagePath);

              images.push(req.files[i].filename);
          }
      }

      // **Check if there are at least 3 images**
      const totalImages = product.productImage.length + images.length;
      if (totalImages < 3) {
          return res.status(400).json({ success: false, message: "Min 3 images are required" });
      }

      // Prepare update fields
      const updateFields = {
          productName: data.productName?.trim(),
          description: data.descriptionData?.trim(),
          category: data.category,
          regularPrice: parseFloat(data.regularPrice) || product.regularPrice,
          salePrice: parseFloat(data.salePrice) || product.salePrice,
          quantity: (data.quantity !== undefined && data.quantity !== '') ? parseInt(data.quantity) : product.quantity,
          color: data.color?.trim() || product.color,
          status: data.status || product.status
      };

      // If new images exist, push them to the existing product images array
      if (images.length > 0) {
          updateFields.$push = { productImage: { $each: images } };
      }

      // Update the product
      const updatedProduct = await Product.findByIdAndUpdate(
          id,
          updateFields,
          { new: true, runValidators: true }
      );

      if (!updatedProduct) {
          return res.status(500).json({ success: false, error: "Failed to update product" });
      }

      return res.status(200).json({ success: true, message: "Product updated successfully" });

  } catch (error) {
      console.error("Error in editProduct:", error);
      res.status(500).json({
          success: false,
          error: "Internal server error",
          details: error.message
      });
  }
};

const deleteSingleImage = async (req, res) => {
  try {
      const { imageNameToServer, productIdToServer } = req.body;

      // Validate inputs
      if (!imageNameToServer || !productIdToServer) {
          return res.json({ 
              success: false, 
              message: "Missing image name or product ID" 
          });
      }

      // Validate product existence
      const product = await Product.findById(productIdToServer);
      if (!product) {
          return res.json({ 
              success: false, 
              message: "Product not found" 
          });
      }

      // // Ensure productImage exists and has at least 3 images
      // if (!product.productImage || product.productImage.length <= 3) {
      //     return res.json({ 
      //         success: false, 
      //         message: "Minimum 3 images are required!" 
      //     });
      // }

      // Check if image exists in product
      if (!product.productImage.includes(imageNameToServer)) {
          return res.json({
              success: false, 
              message: "Image not found in product" 
          });
      }

      // Remove image from database
      await Product.findByIdAndUpdate(
          productIdToServer,
          { $pull: { productImage: imageNameToServer } }
      );

      // Delete image file from server
      const imagePath = path.join('public', 'uploads', 'resized-images', imageNameToServer);

      if (fs.existsSync(imagePath)) {
          try {
              await fs.promises.unlink(imagePath);
              console.log(`Image ${imageNameToServer} deleted successfully`);
          } catch (unlinkError) {
              console.error('Error deleting image file:', unlinkError);
              return res.json({ 
                  success: false, 
                  message: "Failed to delete image file" 
              });
          }
      } else {
          console.log(`Image file ${imageNameToServer} not found`);
      }

      res.json({ success: true, message: "Image deleted successfully" });

  } catch (error) {
      console.error('Error in deleteSingleImage:', error);
      res.json({ 
          success: false, 
          message: "Internal server error", 
          details: error.message 
      });
  }
};

module.exports={
  geProductsAddPage,
  addProducts,
  getAllProducts,
  blockProducts,
  unblockProducts,
  getEditProduct,
  editProduct,
  deleteSingleImage
}