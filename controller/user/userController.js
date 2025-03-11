const User=require('../../models/userSchema')
const Product=require('../../models/productSchema')
const Category=require('../../models/categorySchema')
const Wallet=require('../../models/walletSchema')
const Otp=require('../../models/otpSchema')
const nodemailer=require('nodemailer')
const env=require('dotenv').config()
const bcrypt=require('bcrypt')
const { calculateFinalPrice } = require('../../helpers/priceHelper');


const loadHomepage = async (req, res) => {
  try {
    const user = req.session.user;
    const Categories = await Category.find({ isListed: true });

    const filter = {
      isBlocked: false,
      category: { $in: Categories.map(category => category._id) },
      quantity: { $gt: 0 }
    };

    let productData = await Product.find(filter).populate('category').limit(4);

    let updatedProducts = productData.map(product => {
      const { finalPrice, bestOffer } = calculateFinalPrice(product);
      return {
        ...product.toObject(),
        finalPrice,  // Ensure finalPrice is directly accessible in EJS
        bestOffer
      };
    });

    // Sorting based on createdOn date (newest first)
    updatedProducts.sort((a, b) => new Date(b.createdOn) - new Date(a.createdOn));

    if (user) {
      const userData = await User.findOne({ _id: user });
      return res.render("home", { user: userData, products: updatedProducts });  // Use updatedProducts
    } else {
      return res.render("home", { products: updatedProducts });
    }

  } catch (error) {
    console.log('Homepage not found');
    console.log(error);
    res.status(500).send("Server error");
  }
};


const loadLoginpage=async (req,res) => {
  try {
    if(!req.session.user){
      const loginError = req.session?.userLoginError;
      req.session.userLoginError = null;
      return res.render('login', {message:loginError})
    }
    else{
      res.redirect('/')
    }
  } catch (error) { 
    console.log('Login page not found')
    res.status(500).send("Page not found")
  }
}

const loadRegisterpage=async (req,res) => {
  try {
    if(!req.session.user){
      const errorMessage = req.session.signupError || req.session.googleautherror;
      
      req.session.signupError = null;  
      req.session.googleautherror = null;
      return res.render("register",{
        message:errorMessage
      })
    }else{
      res.redirect('/')
    }
  } catch (error) {
    console.log(error)
    console.log('Homepage not found')
    res.status(500).send("Server error")
  }
}

// const signup=async (req,res) => {
//   const {name,email,phone,password}=req.body
//   try {
//     const newUser=new User({name,email,phone,password})
//     await newUser.save();
    
//     res.redirect('/register')
//   } catch (error) {
//     console.log('Erro on saving data',error)
//     res.status(500).send('Internal server error')
//   }
// }

function generateOtp(){
  return Math.floor(100000 + Math.random() * 900000).toString();
}

async function sendVerificationEmail(email,otp){
  try {
    const transporter= nodemailer.createTransport({
      service:'gmail',
      port:587,
      secure:false,
      requireTLS:true,
      auth:{
        user:process.env.NODEMAILER_EMAIL,
        pass:process.env.NODEMAILER_PASSWORD
      }
    })

    const info=await transporter.sendMail({ 
      from:process.env.NODEMAILER_EMAIL,
      to:email,
      subject:"Verify your account",
      text:`Your OTP is ${otp}`,
      html:`<b>Your OTP: ${otp}<b>`
    })

    return info.accepted.length>0

  } catch (error) {
    console.log('Error sending email',error)
    return false
  }
}


const signup = async (req, res) => {
  try {
    const { name, email, phone, password, referral } = req.body

    const findUser = await User.findOne({ email })
    if (findUser) {
      req.session.signupError = "Email already exists"
      return res.redirect('/register')
    }

    if (referral) {
      const referringUser = await User.findOne({ referralCode: referral })
      if (!referringUser) {
        req.session.signupError = "Invalid referral code"
        return res.redirect('/register')
      }
    }

    const otp = generateOtp()

    await Otp.deleteMany({ email })

    const otpDoc = new Otp({
      email,
      otp,
      createdAt: new Date(), 
    })
    await otpDoc.save()

    const emailSend = await sendVerificationEmail(email, otp)
    if (!emailSend) {
      return res.json("Email-error")
    }

    req.session.userData = { name, phone, email, password, referredBy: referral || null }

    res.render('verify-otp') 
    console.log('OTP sent', otp)

  } catch (error) {
    console.error('Sign Up error', error)
    res.redirect('/pageNotFound')
  }
}



const securePassword=async (password) => {
  try {
    const hashedpassword= await bcrypt.hash(password, 10);

    return hashedpassword
  } catch (error) {
    res.status(500).json({message:"Error hashing password"})
  }
}

function generateReferralCode() {
  return Math.random().toString(36).substring(2, 10).toUpperCase()
}

const verifyOtp = async (req, res) => {
  try {
      const { otp } = req.body;
      const user = req.session?.userData;

      if (!user) {
          return res.status(400).json({
              success: false,
              message: "Session expired. Please restart the signup process."
          });
      }

      const storedOtp = await Otp.findOne({ email: user.email });

      if (!storedOtp) {
          return res.status(400).json({
              success: false,
              message: "OTP expired or not found. Please request a new OTP."
          });
      }

      if (storedOtp.otp.toString() !== otp.toString()) {  
          return res.status(400).json({
              success: false,
              message: "Invalid OTP, please try again."
          });
      }

      const passwordHash = await securePassword(user.password);
      const referralCode = generateReferralCode();

      const saveUserData = new User({
          name: user.name,
          email: user.email,
          phone: user.phone,
          password: passwordHash,
          referralCode: referralCode,
          referredBy: user.referredBy || null,
      });

      await saveUserData.save();

      if (user.referredBy) {
          const referrer = await User.findOne({ referralCode: user.referredBy });

          if (referrer) {
              let referrerWallet = await Wallet.findOne({ userId: referrer._id });

              if (!referrerWallet) {
                  referrerWallet = new Wallet({
                      userId: referrer._id,
                      balance: 0,
                      transactions: [],
                  });
              }

              const referralBonus = 1000;
              referrerWallet.balance += referralBonus;

              referrerWallet.transactions.push({
                  amount: referralBonus,
                  type: "credit",
                  description: `Referral bonus for inviting ${user.email}`,
              });

              await referrerWallet.save();
          }
      }

      let newUserWallet = await Wallet.findOne({ userId: saveUserData._id });

      if (!newUserWallet) {
        newUserWallet = new Wallet({
            userId: saveUserData._id,
            balance: 0,
            transactions: [],
        });
    }

    const signupBonus = 500;
    newUserWallet.balance += signupBonus;

    newUserWallet.transactions.push({
        amount: signupBonus,
        type: "credit",
        description: "Signup bonus credited to wallet",
    });

    await newUserWallet.save();

      await Otp.deleteOne({ email: user.email });

      req.session.user = saveUserData._id;
      req.session.userData = null;

      return res.json({
          success: true,
          message: "OTP verified successfully!",
          redirectUrl: "/"
      });

  } catch (error) {
      console.log('Error verifying OTP', error);
      return res.status(500).json({
          success: false,
          message: "An error occurred during OTP verification."
      });
  }
}


const resendOtp = async (req, res) => {
  try {
    const email = req.session?.userData?.email;

    if (!email) {
      return res.status(400).json({ success: false, message: 'Session expired. Please restart the signup process.' });
    }

    const otp = generateOtp();

    await Otp.deleteMany({ email });

    const otpDoc = new Otp({ email, otp });
    await otpDoc.save();

    const emailSend = await sendVerificationEmail(email, otp);

    if (emailSend) {
      console.log(`OTP resent: ${otp}`);
      return res.status(200).json({ success: true, message: "OTP Resent Successfully" });
    } else {
      return res.status(500).json({ success: false, message: "Failed to resend OTP. Please try again" });
    }

  } catch (error) {
    console.error("Error resending OTP", error);
    return res.status(500).json({ success: false, message: "Internal server error. Please try again" });
  }
};


const login=async (req,res) => {
  try {
    const {email,password}=req.body

  const findUser=await User.findOne({isAdmin:0,email:email})

  if(!findUser){

    req.session.userLoginError = "User not found"
    return res.redirect('/login') 
   }

  if(findUser.isBlocked){
    req.session.userLoginError = "User is blocked"
    return res.redirect('/login')
  }

  const passwordMatch=await bcrypt.compare(password,findUser.password)

  if(passwordMatch){
    req.session.user=findUser._id
    res.redirect('/')
  }
  else{    
    req.session.userLoginError = "Incorrect Password"
    return res.redirect('/login')
  }

  } catch (error) {
    console.error('Login error',error)
    req.session.userLoginError = "Login Failed"
    return res.redirect('/login')
  }

}


const logout = async (req, res) => {
  try {
    req.logout((err) => {
      if (err) {
        console.log('Logout error:', err);
        return res.redirect('/pageNotFound');
      }

      req.session.user = false; 
      req.session.passport = undefined; 
      res.clearCookie('connect.sid'); 

      res.redirect('/login'); 
    });
  } catch (error) {
    console.log('Logout error:', error);
    res.redirect('/pageNotFound');
  }
};

const pageNotFound =async (req,res) => {
  try {
    res.render('pageNotFound')
  } catch (error) {
    console.log('Error loading page not found')
  }
}

const loadShopPage = async (req, res) => {
  try {
    const user = req.session.user;
    const userData = user ? await User.findOne({ _id: user }) : null;

    const categories = await Category.find({ isListed: true });
    const categoryIds = categories.map(category => category._id.toString());

    let selectedCategories = req.query.categories 
      ? req.query.categories.split(',').filter(id => categoryIds.includes(id))
      : categoryIds;

    const page = parseInt(req.query.page) || 1;
    const limit = 9;
    const skip = (page - 1) * limit;

    const selectedSort = req.query.sort || 'newArrivals';
    let sortOption = { createdOn: -1 };

    switch (selectedSort) {
      case "popularity":
        sortOption = { quantity: -1 };
        break;
      case "priceLowToHigh":
        sortOption = { salePrice: 1 };
        break;
      case "priceHighToLow":
        sortOption = { salePrice: -1 };
        break;
      case "aToZ":
        sortOption = { productName: 1 };
        break;
      case "zToA":
        sortOption = { productName: -1 };
        break;
    }

    const filter = {
      isBlocked: false,
      category: { $in: selectedCategories }  
    };

    if (req.query.search) {
      const searchRegex = new RegExp(req.query.search, 'i'); 
      filter.productName = { $regex: searchRegex };
    }

    const products = await Product.find(filter)
      .populate('category')
      .sort(sortOption)
      .collation({ locale: "en", strength: 2 })
      .skip(skip)
      .limit(limit);

    let updatedProducts = products.map(product => {
      const { finalPrice, bestOffer } = calculateFinalPrice(product);
      return {
        ...product.toObject(),
        pricing: {
          finalPrice,
          bestOffer
        }
      };
    });

    if (req.query.minPrice) {
      updatedProducts = updatedProducts.filter(p => p.pricing.finalPrice >= parseInt(req.query.minPrice));
    }

    if (req.query.maxPrice) {
      updatedProducts = updatedProducts.filter(p => p.pricing.finalPrice <= parseInt(req.query.maxPrice));
    }

    const totalProducts = await Product.countDocuments(filter);
    const totalPages = Math.ceil(totalProducts / limit);

    const categoriesWithIds = categories.map(category => ({ _id: category._id, name: category.name }));

    if (req.get('X-Requested-With') === 'Fetch') {
      return res.json({
        products: updatedProducts,
        totalProducts,
        totalPages
      });
    }

    res.render('shop', {
      user: userData,
      products: updatedProducts,
      category: categoriesWithIds,
      totalProducts,
      currentPage: page,
      totalPages,
      selectedSort,
      selectedCategories
    });

  } catch (error) {
    console.log(error);
    res.redirect('/pageNotFound');
  }
};

    const showReferralPage = async (req, res) => {
      try {
          const userId = req.session?.user;
  
          if (!userId) {
              return res.redirect('/login');
          }
  
          const user = await User.findById(userId);
          if (!user) {
              return res.redirect('/login');
          }
  
          const wallet = await Wallet.findOne({ userId }) || { balance: 0, transactions: [] };
  
          const referredUsers = await User.find({ referredBy: user.referralCode });
  
          res.render('referral', { 
              user, 
              wallet, 
              referredUsers 
          });
      } catch (error) {
          console.error('Error loading referral page:', error);
          res.redirect('/');
      }
  };
  





module.exports={
  loadHomepage,
  loadLoginpage,
  loadRegisterpage,
  signup,
  login,
  verifyOtp,
  resendOtp,
  logout,
  pageNotFound,
  loadShopPage,
  showReferralPage
}
