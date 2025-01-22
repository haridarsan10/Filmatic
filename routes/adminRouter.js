const express=require('express')
const router=express.Router()
const adminController=require('../controller/admin/adminController');
const customerController=require('../controller/admin/customerController');
const categoryController=require('../controller/admin/categoryController')
const {userAuth,adminAuth}=require('../middlewares/auth')

router.get('/pageError',adminController.pageError)
router.get('/login',adminController.loadLoginpage)
router.post('/login',adminController.login)
router.get('/',adminAuth,adminController.loadDashboard)
router.get('/logout',adminController.logout)

//Customer Management
router.get('/users',adminAuth,customerController.customerInfo)
router.get('/blockCustomer',adminAuth,customerController.customerBlocked)
router.get('/unblockCustomer',adminAuth,customerController.uncustomerBlocked)

//Category Management
router.get('/category',adminAuth,categoryController.categoryInfo)
router.post('/addcategory',adminAuth,categoryController.addCategory)

module.exports=router