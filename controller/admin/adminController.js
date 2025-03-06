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
  
        const totalRevenue = await Order.aggregate([
          { 
              $match: { 
                  invoiceDate: { 
                      $gte: startDate, 
                      $lte: endDate 
                  }
              }
          },
          { $unwind: '$order_items' },
          { 
              $match: { 
                  'order_items.itemStatus': 'delivered' 
              }
          },
          { 
              $group: { 
                  _id: null, 
                  total: { $sum: { $multiply: ['$order_items.price', '$order_items.quantity'] } } 
              } 
          }
        ]);
  
        const totalCustomers = await User.countDocuments({
          createdAt: { 
              $gte: startDate, 
              $lte: endDate 
          },
          isAdmin: false
        });
  
        console.log('Total Customers:', totalCustomers);
  
        const customerGrowth = await User.aggregate([
          { 
              $match: { 
                  createdAt: { 
                      $gte: startDate, 
                      $lte: endDate 
                  },
                  isAdmin: false
              }
          },
          { 
              $group: { 
                  _id: { $dateToString: { format: "%Y-%m-%d", date: "$createdAt" } },
                  count: { $sum: 1 } 
              }
          },
          { $sort: { _id: 1 } }
        ]);
  
        console.log(customerGrowth);
    
        const totalOrders = await Order.aggregate([
          { 
              $match: { 
                  invoiceDate: { 
                      $gte: startDate, 
                      $lte: endDate 
                  }
              }
          },
          { $unwind: '$order_items' },
          { 
              $match: { 
                  'order_items.itemStatus': 'delivered' 
              }
          },
          { 
              $group: { 
                  _id: '$_id'
              }
          },
          {
              $count: 'total'
          }
        ]);
  
        const salesByDate = await Order.aggregate([
            { 
                $match: { 
                    invoiceDate: { 
                        $gte: startDate, 
                        $lte: endDate 
                    }
                }
            },
            { $unwind: '$order_items' },
            { 
                $match: { 
                    'order_items.itemStatus': 'delivered' 
                }
            },
            { 
                $group: { 
                    _id: { $dateToString: { format: "%Y-%m-%d", date: "$invoiceDate" } },
                    total: { $sum: { $multiply: ['$order_items.price', '$order_items.quantity'] } } 
                }
            },
            { $sort: { _id: 1 } }
        ]);
  
        const topCategories = await Order.aggregate([
            { 
                $match: { 
                    invoiceDate: { 
                        $gte: startDate, 
                        $lte: endDate 
                    }
                }
            },
            { $unwind: '$order_items' },
            { 
                $match: { 
                    'order_items.itemStatus': 'delivered' 
                }
            },
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
                    totalSales: { $sum: { $multiply: ['$order_items.price', '$order_items.quantity'] } }
                }
            },
            { $sort: { totalSales: -1 } },
            { $limit: 5 }
        ]);
  
        const topProducts = await Order.aggregate([
            { 
                $match: { 
                    invoiceDate: { 
                        $gte: startDate, 
                        $lte: endDate 
                    }
                }
            },
            { $unwind: '$order_items' },
            { 
                $match: { 
                    'order_items.itemStatus': 'delivered' 
                }
            },
            {
                $group: {
                    _id: '$order_items.productName',
                    totalQuantity: { $sum: '$order_items.quantity' },
                    totalSales: { $sum: { $multiply: ['$order_items.price', '$order_items.quantity'] } }
                }
            },
            { $sort: { totalQuantity: -1 } },
            { $limit: 5 }
        ]);
  
        const recentOrderIds = await Order.aggregate([
            { 
                $match: { 
                    invoiceDate: { 
                        $gte: startDate, 
                        $lte: endDate 
                    }
                }
            },
            { $unwind: '$order_items' },
            { 
                $match: { 
                    'order_items.itemStatus': 'delivered' 
                }
            },
            { 
                $group: { 
                    _id: '$_id'
                }
            },
            { $sort: { '_id.invoiceDate': -1 } },
            { $limit: 10 }
        ]);
  
        const recentOrders = await Order.find({
            _id: { $in: recentOrderIds.map(o => o._id) }
        })
        .populate('order_items.productId')
        .sort({ invoiceDate: -1 });
  
        res.json({
          totalRevenue: totalRevenue[0]?.total || 0,
          totalCustomers,
          totalOrders: totalOrders[0]?.total || 0,
          salesByDate,
          customerGrowth,
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