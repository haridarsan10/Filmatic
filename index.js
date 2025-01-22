const express=require('express')
const app=express()
const path =require('path')
const env=require("dotenv").config()
const db=require('./config/db')
const userRouter=require('./routes/userRouter')
const adminRouter=require('./routes/adminRouter')
const session=require('express-session')
const passport=require('./config/passport')

db()

app.use(express.json())
app.use(express.urlencoded({extended:true}))


app.use(session({
  secret:process.env.SESSION_SECRET,
  saveUninitialized:true,
  resave:false,
  cookie:{
    secure:false,
    httpOnly:true,
    maxAge:72*60*60*1000
  }
}))

app.use(passport.initialize())
app.use(passport.session())

app.use((req, res, next) => {
  res.set('Cache-Control', 'no-store, no-cache, must-revalidate, private');
  res.set('Pragma', 'no-cache');
  res.set('Expires', '0');
  next();
});


app.set('view engine','ejs')
app.set("views",[path.join(__dirname,'views/user'),path.join(__dirname,'views/admin')])
app.use(express.static(path.join(__dirname,"public")));

app.use("/",userRouter);
app.use('/admin',adminRouter);

app.listen(process.env.PORT,()=>{
  console.log(`Server running in port ${process.env.PORT}`)
})

module.exports={
  app
}