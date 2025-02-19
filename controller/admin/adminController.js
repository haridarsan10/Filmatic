const User=require('../../models/userSchema')
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



module.exports={
  loadLoginpage,
  login,
  loadDashboard,
  pageError,
  logout
}