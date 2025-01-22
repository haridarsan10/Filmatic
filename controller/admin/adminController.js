const User=require('../../models/userSchema')
const bcrypt=require('bcrypt')
const mongoose=require('mongoose')

const loadLoginpage=(req,res) => {
    if(req.session.admin){
      res.redirect('/admin')
    }
    else{
      res.render('admin-login',{message:null})
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
        return res.redirect('/admin/login')
      }
    }
    else{
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
      req.session.destroy((err)=>{
        if(err){
          console.log('Session destroy error!')
          return res.redirect('/pageError')
        }
          res.redirect('/admin/login')
      })
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