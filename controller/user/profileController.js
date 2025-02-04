const User=require('../../models/userSchema')
const Address=require('../../models/addressSchema')
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
    const id=req.session.user
    const userData=req.session.userData
    const addressData=await Address.findOne({_id:id})
    res.render('user-profile',{user:userData,address:addressData})

  } catch (error) {
    console.log(error)
  }
}

const changeEmail=async (req,res) => {
  try {

    const userData=req.session.userData
    const message=req.session.emailError
    req.session.emailError=null;
    res.render('change-email',{user:userData,message:message})

  } catch (error) {
    console.log(error)
    res.redirect('/pageNotFound')
  }
}

const changeEmailValid=async (req,res) => {
  try {
    const {email}=req.body

    const user=await User.findOne({email:email})

    if(user){
      const otp=generateOtp()
      const emailSend=await sendVerificationEmail(email,otp)

      if(emailSend){
        req.session.userOtp=otp
        req.session.email=email
        res.render('change-email-otp')
        console.log('Otp send is:',otp)
      }
      else{
        res.json({message:'Email send error'})
      }
      
    }else{
      req.session.emailError="User with this email does not exist"
      res.redirect('/change-email')
    }

  } catch (error) {
    console.log(error)
    res.redirect('/pageNotFound')
  }
}

  const verifyEmailOtp=async (req,res) => {
    try {
      const {otp}=req.body
      if(otp===req.session.userOtp){
        res.status(200).json({success:true,messag:'Otp verified successfully'})
      }
      else{
        res.status(400).json({success:false,messag:'Otp doesnt match'})
      }

    } catch (error) {
      console.log(error)
    }
  }

  const newEmail=async (req,res) => {
    try {

      const userData=req.session.userData
      res.render('new-email',{user:userData})

    } catch (error) {
      console.log(error)
      res.redirect('/pageNotFound')
    }
  }

    const updateEmail=async (req,res) => {
      try {
        const {email}=req.body
        const id=req.session.user
        
        const currentEmail=req.session.email;

        if(currentEmail===email){
          res.json({success:false,message:"Given email is the current email"}) 
        }
        else{
          await User.findByIdAndUpdate(id,{email:email});
          res.status(200).json({success:true,message:"Email updated Successfully"})
        }
               
      }
       catch (error) {
        res.status(500).json({success:false,message:"Failed to update email"})
      }

    }



    const changePassword=async (req,res) => {
      try {

        const user=req.session.userData
        res.render('change-password',{user:user})

      } catch (error) {
        console.log(error)
      }
    }


    const changePasswordValid=async (req,res) => {
      try {
        const {email}=req.body

        const user=await User.findOne({email:email})

        if(user){
          const otp=generateOtp()
          const emailSend=await sendVerificationEmail(email,otp)

          if(emailSend){
            req.session.userOtp=otp
            req.session.email=email
            res.render('change-password-otp')
            console.log('Otp is :',otp)
          }
          else{
            res.status(400).json({success:false,message:"Error sending email"})
          }
        }
        else{
          res.status(400).json({success:false,message:'User with this email is not found'})
        }

      } catch (error) {
        console.log(error)
        res.redirect('/pageNotFound')
      }
    }


    const verifyChangePassOtp=async (req,res) => {
      try {
        
        const {otp}=req.body

        if(req.session.userOtp===otp){
          res.json({success:true,message:"Otp verification successfull",redirectUrl:'/reset-password'})
        }
        else{
          res.json({success:false,message:"Otp is not valid"}) 
        }

      } catch (error) {
        res.status(500).json({success:false,message:"Error Occured.Please try again"}) 
        console.log(error)
      }
    }


    const address=async (req,res) => {
      try {
        const user=req.session.userData
        const id=req.session.user
        const addressData=await Address.findOne({userId:id})

        let userAddress = null
        if (addressData && addressData.address) {
            userAddress = addressData.address
        }

        res.render('user-address',{user:user,address:userAddress})
      } catch (error) {
        console.log(error)
        res.redirect('/pageNotFound')
      }
    }

    const addAddress=async (req,res) => {
     try {
      const user=req.session.userData
      res.render('add-address',{user:user})

     } catch (error) {
      console.log(error)
      res.redirect('/pageNotFound')
     } 
    }

    const addAddressValid=async (req,res) => {
      try {
        const {addressType,name,city,state,pincode,phone,altphone,landMark}=req.body
        const userId=req.session.user
        const userAddress=await Address.findOne({userId:userId})
        
        if(!userAddress){
            const newAddress= new Address({
              userId,
              address:[{
                addressType,
                name,
                city,
                state,
                pincode,  
                phone,
                altphone:altphone || "N/A",
                landMark
              }]
          })
          await newAddress.save();
          return res.status(200).json({success:true,message:"Address added successfully"})
        }
        else{
          userAddress.address.push({
            addressType,
            name,
            city,
            landMark,
            state,
            pincode,
            phone,
            altphone: altphone || "N/A",
        })

        await userAddress.save()
        return res.status(200).json({success:true,message:"Address added successfully"})
        }

      } catch (error) {
        console.log(error)
        res.json({success:false,message:"Failed to add address"})
      }
    }


    const editAddress=async (req,res) => {
      try {
        const addressid=req.query.id
        const user=req.session.userData
        const addressData=await Address.findOne({"address._id":addressid},{ "address.$": 1 })
        
        let userAddress = null
        if (addressData && addressData.address) {
            userAddress = addressData.address[0]
        }

    
        res.render('edit-address',{user:user,address:userAddress})

      } catch (error) {
        console.log(error)
        res.redirect('/pageNotFound')
      }
    }


    const editAddressValid=async (req,res) => {
      try {

        const {addressId,addressType,name,city,state,pincode,phone,altphone,landMark}=req.body
        const addressData=await Address.findOne({"address._id":addressId})

        if(addressData){
          await Address.updateOne({"address._id":addressId},
            {$set:{
              "address.$":{
                _id:addressId,
                addressType:addressType,
                name:name,
                city:city,
                state:state,
                pincode:pincode,
                phone:phone,
                altphone:altphone,
                landMark:landMark
              }
            }}
          )
          return res.json({success:true,message:"Address updated successfully"})
        }else{
          return res.json({success:false,message:"Address does not exists"})
        }
      } catch (error) {
        console.log(error)
        return res.json({success:false,message:"Something went wrong! Please try again"})
      } 
    }

    const deleteAddress=async (req,res) => {
      try {
        
        const addressId=req.query.id

        const findAddress=await Address.findOne({"address._id":addressId})

        if(findAddress){
          await Address.updateOne({"address._id":addressId},
            {$pull:{
              address:{_id:addressId}
            }}
          )
          res.json({success:true,message:"Address deleted Successfully"})
        }
        else{
          return res.json({success:false,message:"Address deletion failed"})
        }

      } catch (error) {
        console.log(error)
        return res.json({success:false,message:"Something went wrong! Please try again"})
      }
    }

module.exports={
  getForgotPassword,
  forgotEmailValid,
  verifyForgotPassOtp,
  getResetPassword,
  resendOtp,
  postNewPassword,
  userProfile,
  changeEmail,
  changeEmailValid,
  verifyEmailOtp,
  newEmail,
  updateEmail,
  changePassword,
  changePasswordValid,
  verifyChangePassOtp,
  address,
  addAddress,
  addAddressValid,
  editAddress,
  editAddressValid,
  deleteAddress
}