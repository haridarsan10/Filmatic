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

const getListCategory=async (req,res) => {
  try {
    const id=req.query.id
    await category.updateOne({_id:id},{$set:{isListed:false}})
    res.redirect('/admin/category')
  } catch (error) {
    console.log(error)
    res.redirect('/admin/pageError')
  }
}

const getUnListCategory=async (req,res) => {
  try {
    const id=req.query.id
    await category.updateOne({_id:id},{$set:{isListed:true}})
    res.redirect('/admin/category')
  } catch (error) {
    console.log(error)
    res.redirect('/admin/pageError')
  }
}

const getEditCategory=async(req,res)=>{
  try {
    const id=req.query.id
    const categoryData=await category.findOne({_id:id})
    res.render('edit-category',{category:categoryData})

  } catch (error) {
    console.log(error)
    res.redirect('/admin/pageError')
  }
}

const editCategory=async(req,res)=>{
  try {
    const id=req.params.id
    const {categoryName,description}=req.body;
    const existingCategory=await category.findOne({name:categoryName})

    if(existingCategory && existingCategory._id.toString() !== req.params.id){
      return res.status(400).json({error:"Category exists, please choose another name"})
    }

    const updateCategory=await category.findByIdAndUpdate(id,{
      name:categoryName,
      description:description,
    },{new:true})

    if(updateCategory){
      res.redirect('/admin/category')
    }else{
      res.status(404).json({error:"Category not found"})
    }

  } catch (error) {
    console.log(error)
    res.status(500).json({error:'Internal server error'})
  }
}

module.exports={
  categoryInfo,
  addCategory,
  getListCategory,
  getUnListCategory,
  getEditCategory,
  editCategory
}