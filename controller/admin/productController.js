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
            'product-images',
            req.files[i].filename // Create a unique resized file name
          );
          await sharp(originalImagePath).resize({width:440,height:440}).toFile(resizedImagePath)
          images.push(req.files[i].filename)
        }
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
      return res.redirect('/admin/addProducts')

    }
    else{
      return res.status(400).send('Product already exists');
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
    }).limit(limit*1).skip((page-1)*limit).populate('category').exec()
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
    const id=req.query.id
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
      const id = req.params.id;
      const data = req.body;
      // console.log(data)

      // Validate product ID
      if (!id) {
          return res.status(400).json({ error: "Invalid product ID" });
      }

      // Find product and check existence
      const product = await Product.findById(id);
      if (!product) {
          return res.status(404).json({ error: "Product not found" });
      }

      // Check for duplicate product name
      const existingProduct = await Product.findOne({
          productName: data.productName,
          _id: { $ne: id }
      });

      if (existingProduct) {
          return res.status(400).json({ error: "Product with this name already exists" });
      }

      // Process images
      const images = [];
      if (req.files && req.files.length > 0) {
          for (const file of req.files) {
              if (file.filename) {
                  images.push(file.filename);
              }
          }
      }

   

      // Prepare update fields with data validation
      const updateFields = {
          productName: data.productName?.trim(),
          description: data.description?.trim(),
          category: data.category, // Keeping original category if not changed
          regularPrice: parseFloat(data.regularPrice) || product.regularPrice,
          salePrice: parseFloat(data.salePrice) || product.salePrice,
          quantity: parseInt(data.quantity) || product.quantity,
          size: data.size?.trim() || product.size,
          color: data.color?.trim() || product.color,
          status: data.status || product.status  // Add status update
      };


      // Add images if they exist
      if (images.length > 0) {
          updateFields.$push = { productImage: { $each: images } };
      }

      // Update product with validation
      const updatedProduct = await Product.findByIdAndUpdate(
          id,
          updateFields,
          { new: true, runValidators: true }
      );

      if (!updatedProduct) {
          return res.status(500).json({ error: "Failed to update product" });
      }

      res.redirect('/admin/products');

  } catch (error) {
      console.error('Error in editProduct:', error);
      res.status(500).json({ 
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
            return res.status(400).json({ 
                status: false, 
                error: "Missing image name or product ID" 
            });
        }

        // Validate product existence
        const product = await Product.findById(productIdToServer);
        if (!product) {
            return res.status(404).json({ 
                status: false, 
                error: "Product not found" 
            });
        }

        // Check if image exists in product
        if (!product.productImage.includes(imageNameToServer)) {
            return res.status(404).json({ 
                status: false, 
                error: "Image not found in product" 
            });
        }

        // Remove image from database
        await Product.findByIdAndUpdate(
            productIdToServer,
            { $pull: { productImage: imageNameToServer } }
        );

        // Delete image file
        const imagePath = path.join('public', 'uploads', 'product-images', imageNameToServer);

        if (fs.existsSync(imagePath)) {
            try {
                await fs.promises.unlink(imagePath);
                console.log(`Image ${imageNameToServer} deleted successfully`);
            } catch (unlinkError) {
                console.error('Error deleting image file:', unlinkError);
                return res.status(500).json({ 
                    status: false, 
                    error: "Failed to delete image file" 
                });
            }
        } else {
            console.log(`Image file ${imageNameToServer} not found`);
        }

        res.json({ status: true, message: "Image deleted successfully" });

    } catch (error) {
        console.error('Error in deleteSingleImage:', error);
        res.status(500).json({ 
            status: false, 
            error: "Internal server error", 
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