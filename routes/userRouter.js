const express=require('express')
const router=express.Router()
const userController=require('../controller/user/userController');
const productController=require('../controller/user/productController')
const profileController=require('../controller/user/profileController')
const cartController=require('../controller/user/cartController')
const checkOutController=require('../controller/user/checkOutController')
const passport = require('passport');
const {userAuth,isBlocked}=require('../middlewares/auth')


router.get('/',isBlocked,userController.loadHomepage);
router.get('/login',userController.loadLoginpage)
router.post('/login',userController.login)
router.get('/register',userController.loadRegisterpage)
router.post('/register',userController.signup)
router.post('/verify-otp',userController.verifyOtp)
router.post('/resend-otp',userController.resendOtp)
router.get('/logout',userController.logout)
router.get('/pageNotFound',userController.pageNotFound)

//Home and shopping page
router.get('/shop',userController.loadShopPage)


router.get('/auth/google',passport.authenticate('google',{scope:['profile','email']}))

router.get('/auth/google/callback',passport.authenticate('google',{failureRedirect:'/register'}),(req,res)=>{
  req.session.user=req.session.passport.user
  res.redirect('/')

})


//Product Management

router.get('/productDetails',isBlocked,productController.productDetails)
router.get('/example',productController.example)

//Profile Management
router.get('/forgot-password',isBlocked,profileController.getForgotPassword)
router.post('/forgot-email-valid',profileController.forgotEmailValid)
router.post('/verify-passForgot-otp',profileController.verifyForgotPassOtp)
router.get('/reset-password',profileController.getResetPassword)
router.post('/resend-forgot-otp',profileController.resendOtp)
router.post('/reset-password',profileController.postNewPassword)

router.get('/userProfile',userAuth,profileController.userProfile)
router.get('/address',userAuth,profileController.address)
router.get('/add-address',userAuth,profileController.addAddress)
router.post('/add-address',userAuth,profileController.addAddressValid)
router.get('/editAddress',userAuth,profileController.editAddress)
router.post('/editAddress',userAuth,profileController.editAddressValid)
router.get('/deleteAddress',userAuth,profileController.deleteAddress)


router.get('/change-email',userAuth,profileController.changeEmail)
router.post('/change-email-valid',userAuth,profileController.changeEmailValid)
router.post('/verify-email-otp',userAuth,profileController.verifyEmailOtp)
router.get('/new-email',userAuth,profileController.newEmail)
router.post('/update-email',userAuth,profileController.updateEmail)

router.get('/change-password',userAuth,profileController.changePassword)
router.post('/change-password',userAuth,profileController.changePasswordValid)
router.post('/verify-changepassword-otp',userAuth,profileController.verifyChangePassOtp)

//Cart
router.get('/cart',userAuth,cartController.loadCart)
router.post('/addToCart',cartController.addToCart)
router.post('/deleteItem',cartController.deleteItem)

//checkout
router.get('/checkOut',userAuth,checkOutController.checkOut)

module.exports= router;