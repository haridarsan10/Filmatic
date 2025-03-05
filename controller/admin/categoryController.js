const category = require('../../models/categorySchema');

const categoryInfo=async (req,res) => {
  try {
    const page=parseInt(req.query.page) || 1
    const limit=4;
    const skip=(page-1)*limit;

    const categoryData=await category.find({})
    .sort({createdAt:-1})
    .skip(skip)
    .limit(limit);

    const totalCategories=await category.countDocuments();
    const totalPages=Math.ceil(totalCategories/limit)
    const categoryError=req.session.categoryError
    req.session.categoryError=null;

    res.render('category',{
      cat:categoryData,
      currentPage:page,
      totalPages:totalPages,
      totalCategories:totalCategories,
      message:categoryError
    })

  } catch (error) {
    console.log(error)
    res.redirect('/pageError')
  }
}

const addCategory=async (req,res) => {
  try {
    const {name,description}=req.body

    const existingCategory= await category.findOne({
      name: { $regex: `^${name}$`, $options: 'i' } 
    })
    
    if(existingCategory){
     return res.json({success:false,message:'Category already exists'})
    }

    const newCategory=new category({
      name,
      description
    })
    await newCategory.save()
    return res.json({success:true,message:'Category created successfully'})

  } catch (error) {
    console.log(error)
    res.redirect('/pageError')
  }
}

const getListCategory = async (req, res) => {
  try {
    const id = req.query.id;
    await category.updateOne({ _id: id }, { $set: { isListed: false } });
    res.json({ success: true, message: "Category unlisted successfully" });
  } catch (error) {
    console.log(error);
    res.status(500).json({ success: false, message: "Failed to unlist category" });
  }
};

const getUnListCategory = async (req, res) => {
  try {
    const id = req.query.id;
    await category.updateOne({ _id: id }, { $set: { isListed: true } });
    res.json({ success: true, message: "Category listed successfully" });
  } catch (error) {
    console.log(error);
    res.status(500).json({ success: false, message: "Failed to list category" });
  }
};

const getEditCategory=async(req,res)=>{
  try {
    const id=req.params.id
    const categoryData=await category.findOne({_id:id})
    res.render('edit-category',{category:categoryData})

  } catch (error) {
    console.log(error)
    res.redirect('/admin/pageError')
  }
}

const editCategory = async (req, res) => {
  try {
    const id = req.params.id;
    const { categoryName, description } = req.body;

    // Validate input
    if (!categoryName || categoryName.trim().length < 2 || categoryName.trim().length > 50) {
      return res.status(400).json({ 
        error: "Category name must be between 2-50 characters" 
      });
    }

    if (!description || description.trim().length < 10 || description.trim().length > 500) {
      return res.status(400).json({ 
        error: "Description must be between 10-500 characters" 
      });
    }

    // Check for existing category
    const existingCategory = await category.findOne({ 
      name: categoryName.trim(), 
      _id: { $ne: id } 
    });

    if (existingCategory) {
      return res.status(400).json({ 
        error: "Category already exists, please choose another name" 
      });
    }

    // Update category
    const updateCategory = await category.findByIdAndUpdate(
      id, 
      {
        name: categoryName.trim(),
        description: description.trim(),
      }, 
      { new: true, runValidators: true }
    );

    if (!updateCategory) {
      return res.status(404).json({ error: "Category not found" });
    }

    // Successful update
    res.status(200).json({ 
      message: "Category updated successfully",
      category: updateCategory 
    });

  } catch (error) {
    console.error('Edit Category Error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

module.exports={
  categoryInfo,
  addCategory,
  getListCategory,
  getUnListCategory,
  getEditCategory,
  editCategory
}