const express=require('express')
const router=express.Router()
const adminController=require('../controller/admin/adminController');
const customerController=require('../controller/admin/customerController');
const categoryController=require('../controller/admin/categoryController')
const productController=require('../controller/admin/productController')
const adminOrderController=require('../controller/admin/adminOrderController')
const {userAuth,adminAuth}=require('../middlewares/auth')

const multer = require('multer');
const path = require('path');

const storage = multer.diskStorage({
    destination: function (req, file, cb) {
        cb(null, 'public/uploads/product-images');
    },
    filename: function (req, file, cb) {
        cb(null, Date.now() + '-' + file.originalname);
    },
});

const uploads = multer({ storage: storage }); 

router.get('/pageError',adminAuth,adminController.pageError)
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
router.get('/listCategory',adminAuth,categoryController.getListCategory)
router.get('/unlistCategory',adminAuth,categoryController.getUnListCategory)
router.get('/editCategory',adminAuth,categoryController.getEditCategory)
router.post('/editCategory/:id',adminAuth,categoryController.editCategory)

//Product Management
router.get('/addProducts',adminAuth,productController.geProductsAddPage)
router.post('/addProducts', adminAuth, uploads.array('images', 3),productController.addProducts);
router.get('/products',adminAuth,productController.getAllProducts)
router.get('/blockProducts',adminAuth,productController.blockProducts)
router.get('/unblockProducts',adminAuth,productController.unblockProducts)
router.get('/editProduct',adminAuth,productController.getEditProduct)
router.post('/editProduct/:id', adminAuth, uploads.array('images', 3), productController.editProduct);
router.post('/deleteImage',adminAuth,productController.deleteSingleImage)

//Order Management
router.get('/orders',adminOrderController.loadOrders)
router.get('/order-details',adminOrderController.orderDetails)

module.exports=router