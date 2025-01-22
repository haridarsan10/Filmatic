const User=require('../models/userSchema')


const userAuth=(req,res,next)=>{
  if(req.session.user){
    User.findOne(req.session.user)
    .then((data)=>{
      if(data && !data.isBlocked){
        next()
      }
      else{
        res.redirect('/login')
      }
    })
    .catch((error)=>{
      console.log('Error in user auth middleware',error)
      res.status(500).send('Internal server error')
    })
  }
  else{
    res.redirect('/login')
  }
}


// const adminAuth=(req,res,next)=>{
//   User.findOne({isAdmin:true})
//   .then((data)=>{
//     if(data){
//       next()
//     }
//     else{
//       res.redirect('/admin/login')
//     }
//   })
//   .catch((error)=>{
//     console.log('Error in admin auth midddleware',error)
//     res.status(500).send('Internal server error')
//   })
// }

const adminAuth = (req, res, next) => {
  if (req.session.admin) {
    // If the session is active, proceed
    next();
  } else {
    // Redirect to login if session is not active
    res.redirect('/admin/login');
  }
};

module.exports={
  userAuth,
  adminAuth
}