const User = require('../../models/userSchema');
const Order = require('../../models/orderSchema');
const Product = require('../../models/productSchema');
const Category = require('../../models/categorySchema');

const bcrypt=require('bcrypt')
const mongoose=require('mongoose')

const loadLoginpage=(req,res) => {
    if(req.session.admin){
      res.redirect('/admin')
    }
    else{
      const loginError = req.session?.adminLoginError;
      req.session.adminLoginError = null;
      return res.render('admin-login',{message:loginError})
    }
}


const login=async (req,res) => {
  try {
    const {email,password}=req.body
    const admin=await User.findOne({email,isAdmin:true})

    if(admin){
      const passwordMatch=await bcrypt.compare(password,admin.password)

      if(passwordMatch){
        req.session.admin=true;
        return res.redirect('/admin')
      }
      else{
        req.session.adminLoginError = "Password doesn't match"
        return res.redirect('/admin/login')
      }
    }
    else{
      req.session.adminLoginError = "Admin not found"
      return res.redirect('/admin/login')
    }

  } catch (error) {
      console.log('Login Error',error)
      return res.redirect('/pageError')
  }
}

const loadDashboard=async (req,res) => {
  try {
    if(req.session.admin){
     return res.render('admin-dashboard')
    }
    else{
      return res.redirect('/admin/login')
    }
  } catch (error) {
    return res.redirect('/pageError')
  }
}

const pageError=async (req,res) => {
  try {
    res.render("admin-error")
  } catch (error) {
    
  }  
}

const logout=async (req,res) => {
    try {
        req.session.admin=false
        res.redirect('/admin/login')
    } catch (error) {
      console.log('Logout error!')
      return res.redirect('/pageError')
    }
}


const getDashboardData = async (req, res) => {
  try {
      const { period = 'monthly' } = req.query;
      const endDate = new Date();
      let startDate;

      switch(period) {
          case 'weekly':
              startDate = new Date(endDate.getTime() - 7 * 24 * 60 * 60 * 1000);
              break;
          case 'monthly':
              startDate = new Date(endDate.getTime() - 30 * 24 * 60 * 60 * 1000);
              break;
          case 'yearly':
              startDate = new Date(endDate.getTime() - 365 * 24 * 60 * 60 * 1000);
              break;
          default:
              startDate = new Date(endDate.getTime() - 30 * 24 * 60 * 60 * 1000);
      }


      // Total Revenue
      const totalRevenue = await Order.aggregate([
        { 
            $match: { 
                invoiceDate: { 
                    $gte: startDate, 
                    $lte: endDate 
                },
                status: { $ne: 'cancelled' }
            }
        },
        { $group: { _id: null, total: { $sum: '$finalAmount' } } }
    ]);


      // Total Customers
      const totalCustomers = await User.countDocuments({
        createdAt: { 
            $gte: startDate, 
            $lte: endDate 
        },
        isAdmin: false
    });

    console.log('Total Customers:', totalCustomers);


      // Total Orders
      const totalOrders = await Order.countDocuments({
          invoiceDate: { 
              $gte: startDate, 
              $lte: endDate 
          }
      });

      // Sales by Date
      const salesByDate = await Order.aggregate([
          { 
              $match: { 
                  invoiceDate: { 
                      $gte: startDate, 
                      $lte: endDate 
                  },
                  status: { $ne: 'cancelled' }
              }
          },
          { 
              $group: { 
                  _id: { $dateToString: { format: "%Y-%m-%d", date: "$invoiceDate" } },
                  total: { $sum: '$finalAmount' } 
              }
          },
          { $sort: { _id: 1 } }
      ]);

      // Top Selling Categories
      const topCategories = await Order.aggregate([
          { 
              $match: { 
                  invoiceDate: { 
                      $gte: startDate, 
                      $lte: endDate 
                  },
                  status: { $ne: 'cancelled' }
              }
          },
          { $unwind: '$order_items' },
          {
              $lookup: {
                  from: 'products',
                  localField: 'order_items.productId',
                  foreignField: '_id',
                  as: 'product'
              }
          },
          { $unwind: '$product' },
          {
              $lookup: {
                  from: 'categories',
                  localField: 'product.category',
                  foreignField: '_id',
                  as: 'category'
              }
          },
          { $unwind: '$category' },
          {
              $group: {
                  _id: '$category.name',
                  totalSales: { $sum: '$order_items.price' }
              }
          },
          { $sort: { totalSales: -1 } },
          { $limit: 5 }
      ]);

      // Top Selling Products
      const topProducts = await Order.aggregate([
          { 
              $match: { 
                  invoiceDate: { 
                      $gte: startDate, 
                      $lte: endDate 
                  },
                  status: { $ne: 'cancelled' }
              }
          },
          { $unwind: '$order_items' },
          {
              $group: {
                  _id: '$order_items.productName',
                  totalQuantity: { $sum: '$order_items.quantity' },
                  totalSales: { $sum: '$order_items.price' }
              }
          },
          { $sort: { totalQuantity: -1 } },
          { $limit: 5 }
      ]);

      // Recent Orders
      const recentOrders = await Order.find({
          invoiceDate: { 
              $gte: startDate, 
              $lte: endDate 
          }
      })
      .sort({ invoiceDate: -1 })
      .limit(10)
      .populate('order_items.productId');

      res.json({
        totalRevenue: totalRevenue[0]?.total || 0,
        totalCustomers,
        totalOrders,
          salesByDate,
          topCategories,
          topProducts,
          recentOrders
      });
  } catch (error) {
      console.error('Dashboard Data Error:', error);
      res.status(500).json({ error: 'Failed to retrieve dashboard data' });
  }
};



module.exports={
  loadLoginpage,
  login,
  loadDashboard,
  pageError,
  logout,
  getDashboardData
}