const User=require('../../models/userSchema')
const nodemailer=require('nodemailer')
const bcrypt=require('bcrypt')
const env=require('dotenv').config()
const session=require('express-session')


function generateOtp(){
  const digits='1234567890'
  let otp=""

  for(let i=0;i<6;i++){
    otp+=digits[Math.floor(Math.random()*10)]
  }
  return otp
}

const securePassword=async(password)=>{
 try {

  const hashedpassword= await bcrypt.hash(password,10)
  return hashedpassword

 } catch (error) {
  console.log(error)
 }
}

const sendVerificationEmail=async(email,otp)=>{
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

    const mailOptions={ 
      from:process.env.NODEMAILER_EMAIL,
      to:email,
      subject:"Verify your account",
      text:`Your OTP is ${otp}`,
      html:`<b>Your OTP: ${otp}<b>`
    }

    const info=await transporter.sendMail(mailOptions)
    return true

  } catch (error) {
    console.log('Error sending email',error)
    return false
  }
}


const getForgotPassword=async (req,res) => {
  try {
    res.render('forgot-password')
  } catch (error) {
    res.redirect('/pageNotFound')
  }
}

const forgotEmailValid=async (req,res) => {
  try {

    const {email}=req.body
    const findUser=await User.findOne({email:email})

    if(findUser){
      const otp=generateOtp()
      const emailSend=await sendVerificationEmail(email,otp)
      if(emailSend){
        req.session.userOtp=otp
        req.session.email=email
        res.render('forgotPass-otp')
        console.log("OTP send is:",otp)
      }
      else{
        console.log('Error sending mail')
      }
    }
    else{
      res.render('forgot-password',{
        message:"User with this email doesnt exists"
      })
    }

  } catch (error) {
    console.log(error)
    res.redirect('/pageNotFound')
  }
}

const verifyForgotPassOtp=async (req,res) => {
  try {
    
    const enteredOtp=req.body.otp
    if(enteredOtp===req.session.userOtp){
      res.json({success:true,redirectUrl:'/reset-password'})
    }else{
      res.json({success:false,message:'OTP not matching'})
    }

  } catch (error) {
    console.log(error)
    res.status(500).json({success:false,message:'An error occured.Please try again'})
  }
}

const getResetPassword=async (req,res) => {
  try {
    const message=req.session.resetPassError
    req.session.resetPassError=null
    res.render('reset-password',{message:message})
  } catch (error) {
    console.log(error)
    res.redirect('/pageNotFound')
  }
}

const resendOtp=async (req,res) => {
 try {
  const otp=generateOtp()
  req.session.userOtp=otp
  const email=req.session.email
  const emailSend=await sendVerificationEmail(email,otp)
   
  if(emailSend){
   console.log('Resend otp:',otp)
   res.status(200).json({success:true,message:'Resend Otp Successfull'})
  }
 } catch (error) {
  console.log(error)
  res.status(500).json({success:false,message:'Internal Server error'})
 }

}

const postNewPassword=async (req,res) => {
  try {
    const {newPass1,newPass2}=req.body
    const email=req.session.email

    if(newPass1===newPass2){
      const passwordHash=await securePassword(newPass1)

      await User.updateOne({email:email},{$set:{password:passwordHash}})
      res.redirect('/login')
    }
    else{
      req.session.resetPassError="Password doesnt Match"
      res.redirect('/reset-password')
    }

  } catch (error) {
    console.log(error)
    res.redirect('/pageNotFound')
  }
}

const userProfile=async (req,res) => {
  try {
    const userData=req.session.userData
    res.render('user-profile',{user:userData})

  } catch (error) {
    console.log(error)
  }
}

module.exports={
  getForgotPassword,
  forgotEmailValid,
  verifyForgotPassOtp,
  getResetPassword,
  resendOtp,
  postNewPassword,
  userProfile
}