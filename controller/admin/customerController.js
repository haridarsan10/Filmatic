const User=require('../../models/userSchema')
const bcrypt=require('bcrypt')
const mongoose=require('mongoose')

const customerInfo=async (req,res) => {
  try {
    let search=""
    if(req.query.search){
      search=req.query.search 
    }

    let page=1
    if(req.query.page){
      page=req.query.page   || 1
    }

    const limit=4
    const userData=await User.find({
      isAdmin:false,
      $or:[
        {name:{$regex:".*"+search+".*"}},
        {email:{$regex:".*"+search+".*"}},
      ]
    })
    .skip((page-1)*limit)
    .limit(limit)
    .exec();

    // console.log(userData)

    const count=await User.find({
      isAdmin:false,
      $or:[
        {name:{$regex:".*"+search+".*"}},
        {email:{$regex:".*"+search+".*"}},
      ]
    }).countDocuments()



    res.render("customers", {
      data: userData,
      totalPages: Math.ceil(count / limit),
      currentPage: page,
      search: search,
    });
    
  } catch (error) {
    console.log(error)
  }
}

const customerBlocked=async (req,res) => {
  try {
    let id=req.query.id
    await User.updateOne({_id:id},{$set:{isBlocked:true}})
    req.session.user=false

  return res.json({ success: true, message: 'Customer blocked successfully.' });
  } catch (error) {
    console.log(error)
   return res.status(500).json({ success: false, message: 'Failed to block customer.' });
  }
}

const uncustomerBlocked=async (req,res) => {
  try {
    let id=req.query.id  
    await User.updateOne({_id:id},{$set:{isBlocked:false}})
   return res.json({ success: true, message: 'Customer unblocked successfully.' });
  } catch (error) {
   console.log(error)
    return res.status(500).json({ success: false, message: 'Failed to unblock customer.' });
  }
}





module.exports={
  customerInfo,
  customerBlocked,
  uncustomerBlocked
}