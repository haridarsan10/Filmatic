

// const userAuth=(req,res,next)=>{
//   if(req.session.user){
//     User.findOne(req.session.user)
//     .then((data)=>{
//       if(data && !data.isBlocked){
//         next()
//       }
//       else{
//         res.redirect('/login')
//       }
//     })
//     .catch((error)=>{
//       console.log('Error in user auth middleware',error)
//       res.status(500).send('Internal server error')
//     })
//   }
//   else{
//     res.redirect('/login')
//   }
// }

const User=require('../models/userSchema')


// const userAuth =(req, res, next) => {
  // if (req.session.user) {
  //  const userData=
  //   next();
  // } else {
  //   // Redirect to login if session is not active
  //   res.redirect('/login');
  // }
// };

const userAuth=async (req,res,next) => {
  try {
    if (req.session.user) {
      const user=req.session.user
      const userData=await User.findOne({_id:user})
      req.session.userData=userData
       next();

     } else {
       res.redirect('/login');
     }
  } catch (error) {
   console.log(error) 
  }
}


const adminAuth = (req, res, next) => {
  if (req.session.admin) {
    // If the session is active, proceed
    next();
  } else {
    // Redirect to login if session is not active
    res.redirect('/admin/login');
  }
};


const isBlocked = async (req,res,next)=>{
  try {
     if(!req.session.user)return next()
     else{
        const user =await User.findById(req.session.user)
        if(user.isBlocked){
           req.session.user = null;
           req.session.userLoginError="User is Blocked"
           return res.redirect('/login')
        }
        next()
     }
  } catch (error) {
     console.log(error);
     res.redirect('/pageerror')
   }
}



module.exports={
  adminAuth,
  isBlocked,
  userAuth
}