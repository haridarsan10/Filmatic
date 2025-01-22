const category=require('../../models/categorySchema')

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

    res.render('category',{
      cat:categoryData,
      currentPage:page,
      totalPages:totalPages,
      totalCategories:totalCategories
    })

  } catch (error) {
    console.log(error)
    res.redirect('/pageError')
  }
}

const addCategory=async (req,res) => {
  try {
    const {name,description}=req.body

    const existingCategory= await category.findOne({name})
    if(existingCategory){
     return res.status(400).send('Category already exists')
    }

    const newCategory=new category({
      name,
      description
    })
    await newCategory.save()

    return res.redirect('/admin/category');

  } catch (error) {
    console.log(error)
    res.redirect('/pageError')
  }
}

module.exports={
  categoryInfo,
  addCategory
}