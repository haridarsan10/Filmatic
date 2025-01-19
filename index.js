const express=require('express')
const app=express()
const env=require("dotenv").config()
const db=require('./config/db')
db()

app.listen(parseInt(process.env.PORT),()=>{
  console.log("Server running in port 3000")
})

module.exports={
  app
}