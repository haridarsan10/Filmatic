const express=require('express')
const router=express.Router()
const userController=require('../controller/user/userController');
const passport = require('passport');


router.get('/',userController.loadHomepage);
router.get('/login',userController.loadLoginpage)
router.post('/login',userController.login)
router.get('/register',userController.loadRegisterpage)
router.post('/register',userController.signup)
router.post('/verify-otp',userController.verifyOtp)
router.post('/resend-otp',userController.resendOtp)
router.get('/logout',userController.logout)
router.get('/pageNotFound',userController.pageNotFound)

router.get('/auth/google',passport.authenticate('google',{scope:['profile','email']}))

router.get('/auth/google/callback',passport.authenticate('google',{failureRedirect:'/register'}),(req,res)=>{
  res.redirect('/')
})

module.exports= router;