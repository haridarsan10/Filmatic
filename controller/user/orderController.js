const User=require('../../models/userSchema')
const Address=require('../../models/addressSchema')
const Product=require('../../models/productSchema')
const Category=require('../../models/categorySchema')
const Cart=require('../../models/cartSchema')
const Order=require('../../models/orderSchema')
const Coupon=require('../../models/couponSchema')
const Wallet = require("../../models/walletSchema");
const Razorpay = require("razorpay");
const crypto = require("crypto"); 
const mongoose=require('mongoose')
require("dotenv").config();
const PDFDocument = require('pdfkit');
const fs = require('fs'); 
const path = require('path'); 
const {calculateRefundAmount} = require('../../helpers/priceHelper');



const loadOrders = async (req, res) => {
  try {
    const userData = req.session.userData;
    const userId = req.session.user;

    let page=parseInt(req.query.page) || 1
    let limit=5
    let skip=(page-1)*limit

    const totalOrders = await Order.countDocuments({ userId: userId });
    const totalPages = Math.ceil(totalOrders / limit); 

    const userOrders = await Order.find({ userId: userId })
      .populate({
        path: 'order_items.productId',
        select: 'productImage' 
      })
      .skip(skip)
      .limit(limit)
      .sort({createdAt:-1})

    const ordersData = userOrders.map(order => ({
      orderId: order.orderId,
      status: order.status,
      total: order.finalAmount,      
      image: order.order_items.length > 0 && order.order_items[0].productId 
        ? order.order_items[0].productId.productImage[0] || 'default.jpg' 
        : 'default.jpg'
    }));

    res.render('orders', { user: userData, orders: ordersData,currentPage: page,totalPages: totalPages  });

  } catch (error) {
    console.log(error);
    res.redirect('/pageNotFound');
  }
};


const orders = async (req, res) => {
  try {
    const { addressId, paymentMethod, totalPrice, cartItems, couponCode, discountAmount } = req.body;
    const userId = req.session.user;

    const addressData = await Address.findOne({ userId });
    const selectedAddress = addressData?.address.find(a => a._id.toString() === addressId);

    if (!selectedAddress) {
      return res.status(400).json({ success: false, message: "Invalid address." });
    }

    const productIds = cartItems.map(item => item.productId._id);
    const products = await Product.find({ _id: { $in: productIds } });

    if (products.length !== cartItems.length) {
      return res.status(400).json({ success: false, message: "Some products are no longer available." });
    }

    for (const item of cartItems) {
      const product = products.find(p => p._id.toString() === item.productId._id);

      if (product.quantity < item.quantity) {
        return res.status(400).json({ 
          success: false, 
          message: `Insufficient stock for ${product.productName}` 
        });
      }
    }

    if (couponCode && couponCode !== 'null') {
      const coupon = await Coupon.findOne({ code: couponCode });

      if (!coupon || coupon.usageLimit <= 0) {
        return res.status(400).json({ success: false, message: "Invalid or expired coupon." });
      }

      coupon.usageLimit -= 1;
      await coupon.save();
    }

    const newOrder = new Order({
      userId,
      address_id: addressId,
      payment_method: paymentMethod,
      order_items: cartItems.map(item => ({
        productId: item.productId._id,
        productName: item.productId.productName,
        price: item.price,
        quantity: item.quantity,
        totalPrice: Math.round(item.totalPrice),
      })),
      total: Math.round(totalPrice),
      status: "pending",
      discount: Math.round(discountAmount),
      finalAmount: Math.round(totalPrice - discountAmount),
      couponApplied: !!couponCode,
      couponCode,
    });

    await newOrder.save();

    for (let item of cartItems) {
      await Product.findByIdAndUpdate(
        item.productId._id,
        { $inc: { quantity: -item.quantity } }
      );
    }

    await Cart.findOneAndUpdate(
      { userId },
      { $set: { items: [], cartTotal: 0 } }
    );

    return res.status(200).json({ success: true, message: "Order placed successfully" });

  } catch (error) {
    console.error(error);
    return res.status(500).json({ success: false, message: "Internal server error." });
  }
};

const walletOrder = async (req, res) => {
  try {
      const { addressId, paymentMethod, totalPrice, cartItems, couponCode, discountAmount } = req.body;
      const userId = req.session.user;

      const addressData = await Address.findOne({ userId });
      const selectedAddress = addressData?.address.find(a => a._id.toString() === addressId);

      if (!selectedAddress) {
          return res.status(400).json({ success: false, message: "Invalid address." });
      }

      const productIds = cartItems.map(item => item.productId._id);
      const products = await Product.find({ _id: { $in: productIds } });

      if (products.length !== cartItems.length) {
          return res.status(400).json({ success: false, message: "Some products are no longer available." });
      }

      for (const item of cartItems) {
          const product = products.find(p => p._id.toString() === item.productId._id);
          if (product.quantity < item.quantity) {
              return res.status(400).json({
                  success: false,
                  message: `Insufficient stock for ${product.productName}`
              });
          }
      }

      const walletData = await Wallet.findOne({ userId });
      if (!walletData) {
          return res.status(404).json({ success: false, message: "Failed to fetch wallet data" });
      }

      const payableAmount = Math.round(totalPrice - discountAmount);
      if (walletData.balance < payableAmount) {
          return res.status(400).json({ success: false, message: "Insufficient wallet balance to place the order." });
      }

      walletData.balance -= payableAmount;
      walletData.transactions.push({
        amount:payableAmount,
        type:"debit",
        description: `Order placed using wallet - Order Total: ${payableAmount}`,
      })
      
      await walletData.save();

      const newOrder = new Order({
          userId,
          address_id: addressId,
          payment_method: paymentMethod,
          order_items: cartItems.map(item => ({
              productId: item.productId._id,
              productName: item.productId.productName,
              price: item.price,
              quantity: item.quantity,
              totalPrice: Math.round(item.totalPrice),
          })),
          total: Math.round(totalPrice),
          status: "pending", 
          discount: Math.round(discountAmount),
          finalAmount: payableAmount,
          couponApplied: !!couponCode,
          couponCode,
      });

      await newOrder.save();

      if (couponCode && couponCode !== 'null') {
          await Coupon.findOneAndUpdate(
              { code: couponCode },
              { $inc: { usageLimit: -1 } }
          );
      }

      await Promise.all(
          cartItems.map(item =>
              Product.findByIdAndUpdate(item.productId._id, { $inc: { quantity: -item.quantity } })
          )
      );

      await Cart.findOneAndUpdate(
          { userId },
          { $set: { items: [], cartTotal: 0 } }
      );



      return res.status(200).json({ success: true, message: "Order placed successfully" });

  } catch (error) {
      console.error(error);
      return res.status(500).json({ success: false, message: "Internal server error." });
  }
};



  const loadOrderDetails = async (req, res) => {
    try {

      const userData = req.session.userData;
      const orderId = req.query.id.trim(); 

      const order = await Order.findOne({ orderId })
        .populate('order_items.productId', 'productName productImage') 
        .exec();

        const addressId=order.address_id.toString()

        const address = await Address.findOne({
          "address._id": addressId
        }).select("address.$");  
        
        const foundAddress = address?.address[0] || {}; 

        const products = order.order_items.map(item => ({
          productId:item.productId?._id,
          productImage: item.productId?.productImage || 'default-image.jpg', 
          productName: item.productId.productName,
          price: item.price,
          quantity: item.quantity,
          total: item.price * item.quantity,
          itemStatus:item.itemStatus
        }));


      res.render('order-details',{ user:userData,products:products,order:order,address:foundAddress})

    } catch (error) {
      console.log("Error fetching order details:", error);
      res.status(500).send("Internal Server Error");
    }
  };


  const cancelOrder = async (req, res) => {
    try {
      const { orderId} = req.body;
      
      console.log(req.body);
      
      if (!orderId) {
        return res.status(404).json({ success: false, message: "Invalid Order ID." });
      }
  
      const order = await Order.findOne({ orderId: orderId });
        
      if (!order) {
        return res.status(404).json({ success: false, message: "Order not found." });
      }
  
      if (!order.userId || !order.userId._id) {
        return res.status(404).json({ success: false, message: "User ID not found." });
      }
  
      if (order.payment_method === "razorpay") {
        const updateResult = await Order.updateOne({ orderId }, { $set: { status: "cancelled" } });
  

        if (updateResult.modifiedCount > 0) {
          let wallet = await Wallet.findOne({ userId: order.userId._id });
  
          if (!wallet) {
            wallet = new Wallet({ userId: order.userId._id, balance: 0, transactions: [] });
          }
  
          const refundAmount = order.finalAmount;
          wallet.balance += refundAmount;
  
          wallet.transactions.push({
            amount: refundAmount,
            type: "credit",
            description: `Refund for order ${order.orderId}`,
            date: new Date()
          });
  
          order.refundStatus = "completed";
  
          await wallet.save();
          await order.save();
  
          return res.status(200).json({ success: true, message: "Order cancelled successfully and amount refunded to the wallet." });
        } else {
          return res.status(404).json({ success: false, message: "Order status update failed." });
        }
      }
  
      const updateResult = await Order.updateOne({ orderId }, { $set: { status: "cancelled" } });
  
      if (updateResult.nModified > 0) {
        return res.status(200).json({ success: true, message: "Order cancelled successfully." });
      } else {
        return res.status(404).json({ success: false, message: "Order status update failed." });
      }
  
    } catch (error) {
      console.error(error);
      res.status(500).json({ success: false, message: "Some error occurred." });
    }
  };


  const cancelProduct = async (req, res) => {
    try {
        const { orderId, productId } = req.body;

        const order = await Order.findOne({ orderId });

        if (!order) {
            return res.json({ success: false, message: 'Order not found' });
        }

        const product = order.order_items.find(item => item.productId.toString() === productId);

        if (!product) {
            return res.json({ success: false, message: 'Product not found in order' });
        }

        if (product.itemStatus === 'cancelled') {
            return res.json({ success: false, message: 'Product is already cancelled' });
        }

        product.itemStatus = 'cancelled';

        const productData=await Product.findOne({_id:productId})

        if(productData){
          productData.quantity+=product.quantity
          await productData.save();
        }
        else{
          return res.json({ success: false, message: 'Product is not found in the inventory' });
        }

        if (order.payment_method === 'razorpay') {
            const refundAmount = calculateRefundAmount(order, productId);

            let wallet = await Wallet.findOne({ userId: req.session.user });

            if (!wallet) {
                wallet = new Wallet({ userId: req.session.user, balance: 0, transactions: [] });
            }

            wallet.balance += refundAmount;

            wallet.transactions.push({
                amount: refundAmount,
                type: "credit",
                description: `Refund for cancelled product (${product.productName}) from order ${orderId}`
            });

            await wallet.save();
        }

        const allCancelled = order.order_items.every(item => item.itemStatus === 'cancelled');
        if (allCancelled) {
            order.status = 'cancelled';
        }

        await order.save();


        return res.json({ success: true, message: 'Product cancelled and refund processed (if applicable)' });


    } catch (error) {
        console.error('Error cancelling product:', error);
        return res.status(500).json({ success: false, message: 'Something went wrong' });
    }
};



    const returnOrder=async (req,res) => {
      try {
        const { orderId, reason } = req.body;

        const order = await Order.findOne({orderId:orderId});
        if (!order) return res.status(404).json({ message: "Order not found" });

        order.returnRequest = true;
        order.returnStatus = "pending";
        order.returnReason = reason;
        await order.save();

        res.status(200).json({ message: "Return request submitted successfully" });
      } catch (error) {
        res.status(500).json({ message: "Internal Server Error" });
      }
    }


    const generateInvoicePDF = async (req, res) => {
      try {
        const { orderId } = req.params;

        const order = await Order.findById(orderId)
          .populate('userId', 'name email phone')
          .populate('order_items.productId', 'productName price');

        if (!order) {
          return res.status(404).json({ success: false, message: "Order not found" });
        }

        console.log(order)

        const userAddress = await Address.findOne(
          { "address._id": order.address_id },
          { "address.$": 1 }
        );
        
        const orderAddress = userAddress ? userAddress.address[0] : null;

        const doc = new PDFDocument({ margin: 50, size: 'A4' });
        const filePath = path.join(__dirname, `../../publics/invoices/invoice_${orderId}.pdf`);
        const stream = fs.createWriteStream(filePath);
        doc.pipe(stream);

        // Header
        doc.fontSize(24).font('Helvetica-Bold').text('Filmatic', { align: 'center' }).moveDown(0.5);
        doc.fontSize(16).font('Helvetica').text('Invoice', { align: 'center' }).moveDown(0.5);
        doc.fontSize(10)
          .text(`Order ID: ${order._id}`, 50, doc.y)
          .text(`Date: ${new Date(order.createdAt).toLocaleDateString()}`, { align: 'right' })
          .moveDown(1);

        // Customer Details
        doc.fontSize(12).font('Helvetica-Bold').text('Customer Details').moveDown(0.5);
        doc.fontSize(10)
          .text(`Name: ${order.userId.name}`)
          .text(`Email: ${order.userId.email}`)
          .text(`Phone: ${order.userId.phone}`)
          .text(`Address: ${orderAddress.city}, ${orderAddress.state},${orderAddress.pincode}`)
          .moveDown(1);

          // Order Status Details
          doc.fontSize(12).font('Helvetica-Bold').text('Order Details').moveDown(0.5);
          doc.fontSize(10)
            .text(`Status: ${order.status}`)
            .text(`Payment Method: ${order.payment_method}`)
            .text(`Payment Status: ${order.paymentStatus}`)
            .text(`Coupon Applied: ${order.couponApplied ? 'Yes' : 'No'}`)
            .text(`Coupon Code: ${order.couponCode || 'N/A'}`)
            .text(`Discount: ${order.discount}`)
            .moveDown(1);

        // Order Summary
        doc.fontSize(12).font('Helvetica-Bold').text('Order Summary').moveDown(0.5);

        const tableHeaders = ['Product', 'Price', 'Quantity','ProductStatus', 'Total'];
        const columnWidths = [200, 80, 80, 80];
        let xPosition = 50;
        let yPosition = doc.y;

        // Draw Table Header
        doc.rect(50, yPosition, 500, 25).fill('#f0f0f0');
        doc.fillColor('black').font('Helvetica-Bold').fontSize(10);

        tableHeaders.forEach((header, i) => {
          doc.text(header, xPosition, yPosition + 7, { width: columnWidths[i], align: 'center' });
          xPosition += columnWidths[i];
        });

        yPosition += 25;
        doc.moveDown(0.5);

        doc.font('Helvetica').fontSize(10).fillColor('black');
        order.order_items.forEach((item) => {
          if (yPosition > 750) {
            doc.addPage();
            yPosition = 50;
          }

          xPosition = 50;
          doc.text(item.productId.productName, xPosition, yPosition, { width: columnWidths[0], align: 'center' });
          xPosition += columnWidths[0];

          doc.text(`₹${item.price}`, xPosition, yPosition, { width: columnWidths[1], align: 'center' });
          xPosition += columnWidths[1];

          doc.text(`${item.quantity}`, xPosition, yPosition, { width: columnWidths[2], align: 'center' });
          xPosition += columnWidths[2];

          doc.text(`${item.itemStatus}`, xPosition, yPosition, { width: columnWidths[2], align: 'center' });
          xPosition += columnWidths[2];


          doc.text(`₹${item.price * item.quantity}`, xPosition, yPosition, { width: columnWidths[3], align: 'center' });
          yPosition += 20;
        });

        const startX = 350; 
        const amountX = 500;  
        let currentY = doc.y + 20;  
        
        doc.fontSize(12).font('Helvetica-Bold');
        
        // Total Amount - Same Line
        doc.text('Total Amount', startX, currentY);
        doc.text(`₹${order.total}`, amountX, currentY);
        
        // Discount Amount - Same Line
        currentY += 20;  // Move down for the next row
        doc.font('Helvetica');
        doc.text('Discount Amount', startX, currentY);
        doc.text(`₹${order.discount}`, amountX, currentY);
        
        // Final Amount - Same Line
        currentY += 20;
        doc.font('Helvetica-Bold');
        doc.text('Final Amount', startX, currentY);
        doc.text(`₹${order.finalAmount}`, amountX, currentY);
        
        doc.moveDown(1);  // Space after table if needed
        
       

        // Footer
        doc.fontSize(8).text('© 2024 Filmatic. All rights reserved.', 50, 780, { align: 'center' });

        doc.end();

        stream.on('finish', () => {
          res.download(filePath, `Invoice_${orderId}.pdf`, (err) => {
            if (err) {
              console.error("Error downloading invoice:", err);
              res.status(500).send("Error downloading invoice");
            }
            fs.unlinkSync(filePath);
          });
        });

      } catch (error) {
        console.log("Error generating invoice PDF", error);
        res.status(500).json({ success: false, message: "Internal server error" });
      }
    };



    const checkStock = async (req, res) => {
      try {
          const { cartItems } = req.body;
          
          if (!cartItems || !Array.isArray(cartItems) || cartItems.length === 0) {
              return res.status(400).json({ 
                  success: false, 
                  message: "Invalid cart items data" 
              });
          }
          
          const outOfStockItems = [];
          
          for (const item of cartItems) {
              const product = await Product.findById(item.productId);
              
              if (!product) {
                  outOfStockItems.push("Unknown product");
                  continue;
              }
              
              if (product.quantity < 1) {
                  outOfStockItems.push(product.productName + " (Out of stock)");
                  continue;
              }
              
              if (product.quantity < item.quantity) {
                  outOfStockItems.push(`${product.productName} (Only ${product.quantity} available)`);
              }
          }
          
          if (outOfStockItems.length > 0) {
              return res.status(200).json({
                  success: false,
                  message: "The following items have stock issues: " + outOfStockItems.join(", ")
              });
          }
          
          return res.status(200).json({
              success: true,
              message: "All products are in stock"
          });
          
      } catch (error) {
          console.error("Check Stock Error:", error);
          return res.status(500).json({ 
              success: false, 
              message: "Error checking product stock" 
          });
      }
  };

  const returnProduct = async (req, res) => {
    try {
      const { orderId, productId, reason } = req.body;
  
      if (!orderId || !productId || !reason) {
        return res.status(400).json({ success: false, message: "Required fields are missing." });
      }
  
      const order = await Order.findOne({ orderId });
      if (!order) {
        return res.status(404).json({ success: false, message: "Order not found." });
      }
  
      const productItem = order.order_items.find(item => item.productId.toString() === productId);
  
      if (!productItem) {
        return res.status(404).json({ success: false, message: "Product not found in this order." });
      }
  
      if (productItem.itemStatus === 'returned') {
        return res.status(400).json({ success: false, message: "This product has already been returned." });
      }
  
      productItem.itemStatus = 'returnRequested';
      productItem.returnReason = reason;
  
      await order.save();
  
      return res.status(200).json({
        success: true,
        message: "Product return request submitted successfully."
      });
  
    } catch (error) {
      console.error("Error in returnProduct:", error);
      return res.status(500).json({ success: false, message: "Internal server error." });
    }
  };
  
  

module.exports={
  orders,
  loadOrders,
  loadOrderDetails,
  cancelOrder,
  returnOrder,
  generateInvoicePDF,
  checkStock,
  cancelProduct,
  returnProduct,
  walletOrder
}