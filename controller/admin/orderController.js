const PDFDocument = require('pdfkit'); 
const path = require('path'); 
const fs = require('fs');
const Product = require('../../models/productSchema');
const Category=require('../../models/categorySchema')
const User=require('../../models/userSchema')
const Coupon=require('../../models/couponSchema')
const Order=require('../../models/orderSchema')
const Wallet = require("../../models/walletSchema");

const loadReturn = async (req, res) => {
  try {
    const returnOrders = await Order.find({ returnReason: { $ne: null }, returnStatus: "pending" })
      .populate('userId', 'name email') 
      .populate('order_items.productId', 'image'); 

    res.render('return-requests', { returnOrders });

  } catch (error) {
    console.log(error);
    res.redirect('/admin/pageError');
  }
};


const rejectReturn = async (req, res) => {
  try {
    const { orderId, rejectReason } = req.body;

    console.log(req.body);

    const order = await Order.findOne({ _id: orderId });

    if (!order) {
      return res.status(404).json({ success:false, message: "Order not found" });
    }

    console.log(order);

    order.returnStatus = "rejected";  
    order.returnReason = rejectReason;
    await order.save();

    return res.status(200).json({ success:true,message: "Return request rejected successfully." });

  } catch (error) {
    console.error("Error rejecting return:", error);
    return res.status(500).json({ success:false,message: "Internal server error" });
  }
};



const approveReturn = async (req, res) => {
    try {
        const { orderId } = req.body;
        console.log(req.body)

        const order = await Order.findById(orderId).populate("userId");
        if (!order) {
            return res.status(404).json({ success:false,message: "Order not found" });
        }

        if (order.returnStatus !== "pending") {
            return res.status(400).json({ success:false ,message: "Return request is not pending" });
        }

        console.log(order)

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

        order.status = "returned";
        order.returnStatus = "approved";
        order.refundStatus = "completed";

        await wallet.save();
        await order.save();

        return res.status(200).json({success:true, message: "Return request approved, amount refunded to wallet." });

    } catch (error) {
        console.error("Error approving return:", error);
        return res.status(500).json({ success:false ,message: "Internal server error" });
    }
};


const getSalesReport = async (req, res) => {
    try {
        const page = parseInt(req.query.page) || 1; 
        const limit = 10; 
        const skip = (page - 1) * limit;

        const { filterBy, fromDate, toDate } = req.query;

        let filter = { status: "delivered" };

        if (fromDate && toDate) {
            filter.createdAt = {
                $gte: new Date(fromDate),
                $lte: new Date(toDate)   
            };
        } else {

            const today = new Date();
            if (filterBy === "daily") {
                filter.createdAt = {
                    $gte: new Date(today.setHours(0, 0, 0, 0)), 
                    $lte: new Date()
                };
            } else if (filterBy === "weekly") {
                const lastWeek = new Date();
                lastWeek.setDate(lastWeek.getDate() - 7);
                filter.createdAt = {
                    $gte: lastWeek,
                    $lte: new Date()
                };
            } else if (filterBy === "monthly") {
                const lastMonth = new Date();
                lastMonth.setMonth(lastMonth.getMonth() - 1);
                filter.createdAt = {
                    $gte: lastMonth,
                    $lte: new Date()
                };
            }
        }

        // Count filtered orders
        const totalOrders = await Order.countDocuments(filter);
        console.log("Total Filtered Orders:", totalOrders);

        // Calculate total revenue for filtered orders
        const totalSales = await Order.aggregate([
            { $match: filter }, // Apply filter
            {
                $group: {
                    _id: null,
                    total: { $sum: "$finalAmount" }
                }
            }
        ]);

        const totalRevenue = totalSales.length > 0 ? totalSales[0].total : 0;
        console.log("Filtered Total Revenue:", totalRevenue);

        const totalPages = Math.ceil(totalOrders / limit);

        // Fetch filtered orders with pagination
        const orders = await Order.find(filter)
            .populate('userId', 'name email phone')
            .populate('order_items.productId', 'productName price')
            .sort({ createdAt: -1 })
            .skip(skip)
            .limit(limit);

        res.render('sales-report', {
            orders,
            totalRevenue,
            totalOrders,
            currentPage: page,
            totalPages,
            filterBy,
            fromDate,
            toDate
        });

    } catch (error) {
        console.log("Error getting sales report", error);
        res.status(500).json({ success: false, message: "Internal server error" });
    }
};

  

const getSalesReportPDF = async (req, res) => {
    try {
        const { filterBy, fromDate, toDate } = req.query;
        let filter = { status: "delivered" };

        // Apply date filters
        if (fromDate && toDate) {
            filter.createdAt = {
                $gte: new Date(fromDate),
                $lte: new Date(toDate)
            };
        } else {
            const today = new Date();
            if (filterBy === "daily") {
                filter.createdAt = {
                    $gte: new Date(today.setHours(0, 0, 0, 0)),
                    $lte: new Date()
                };
            } else if (filterBy === "weekly") {
                const lastWeek = new Date();
                lastWeek.setDate(lastWeek.getDate() - 7);
                filter.createdAt = {
                    $gte: lastWeek,
                    $lte: new Date()
                };
            } else if (filterBy === "monthly") {
                const lastMonth = new Date();
                lastMonth.setMonth(lastMonth.getMonth() - 1);
                filter.createdAt = {
                    $gte: lastMonth,
                    $lte: new Date()
                };
            }
        }

        const orders = await Order.find(filter)
            .populate('userId', 'name email phone')
            .populate('order_items.productId', 'productName price')
            .sort({ createdAt: -1 });

        const totalSales = orders.reduce((sum, order) => sum + order.finalAmount, 0);
        const totalOrders = orders.length;

        const doc = new PDFDocument({
            margin: 50,
            size: 'A4'
        });
        const filePath = path.join(__dirname, '../publics/salesReport/sales_report.pdf');
        const stream = fs.createWriteStream(filePath);
        doc.pipe(stream);

        doc.fontSize(24)
           .font('Helvetica-Bold')
           .text('Filmatic', { align: 'center' })
           .moveDown(0.5);

        doc.fontSize(16)
           .font('Helvetica')
           .text('Sales Report', { align: 'center' })
           .moveDown(0.5);

        doc.fontSize(10)
           .text(`Generated on: ${new Date().toLocaleDateString('en-US', {
               year: 'numeric',
               month: 'long',
               day: 'numeric'
           })}`, { align: 'center' })
           .moveDown(1);

        doc.rect(50, doc.y, 500, 60).stroke();
        doc.fontSize(12)
           .text('Summary', 60, doc.y + 10)
           .fontSize(10)
           .text(`Total Orders: ${totalOrders}`, 60, doc.y + 5)
           .text(`Total Sales: ₹${totalSales.toLocaleString()}.00`, 60, doc.y + 5)
           .moveDown(2);

        const tableTop = doc.y;
        const tableHeaders = ['Order ID', 'Date', 'Customer Name', 'Status', 'Amount'];
        const columnWidths = [120, 80, 140, 80, 80];
        let xPosition = 50;

        doc.rect(50, tableTop, 500, 20).fill('#f0f0f0');

        doc.font('Helvetica-Bold').fontSize(10);
        tableHeaders.forEach((header, i) => {
            doc.fillColor('black')
               .text(header, xPosition, tableTop + 5, {
                   width: columnWidths[i],
                   align: header === 'Amount' ? 'right' : 'left'
               });
            xPosition += columnWidths[i];
        });

        doc.font('Helvetica').fontSize(9);
        let yPosition = tableTop + 25;

        orders.forEach((order, index) => {
            if (yPosition > 750) {
                doc.addPage();
                yPosition = 50;

                xPosition = 50;
                doc.rect(50, yPosition, 500, 20).fill('#f0f0f0');
                doc.font('Helvetica-Bold').fontSize(10);
                tableHeaders.forEach((header, i) => {
                    doc.fillColor('black')
                       .text(header, xPosition, yPosition + 5, {
                           width: columnWidths[i],
                           align: header === 'Amount' ? 'right' : 'left'
                       });
                    xPosition += columnWidths[i];
                });
                doc.font('Helvetica').fontSize(9);
                yPosition += 25;
            }

            if (index % 2 === 0) {
                doc.rect(50, yPosition - 5, 500, 20).fill('#f9f9f9');
            }

            xPosition = 50;
            doc.fillColor('black')
               .text(order._id.toString().slice(-8), xPosition, yPosition, {
                   width: columnWidths[0]
               });

            xPosition += columnWidths[0];
            doc.text(new Date(order.createdAt).toLocaleDateString(), xPosition, yPosition, {
                width: columnWidths[1]
            });

            xPosition += columnWidths[1];
            doc.text(order.userId.name, xPosition, yPosition, {
                width: columnWidths[2]
            });

            xPosition += columnWidths[2];
            doc.text(order.status, xPosition, yPosition, {
                width: columnWidths[3]
            });

            xPosition += columnWidths[3];
            doc.text(`₹${order.finalAmount.toLocaleString()}.00`, xPosition, yPosition, {
                width: columnWidths[4],
                align: 'right'
            });

            yPosition += 20;
        });

        doc.fontSize(8)
           .text('© 2024 Filmatic. All rights reserved.', 50, 780, { align: 'center' });

        doc.end();

        stream.on('finish', () => {
            res.download(filePath, 'Filmatic_sales_report.pdf', (err) => {
                if (err) {
                    console.error("Error downloading PDF:", err);
                    res.status(500).send("Error downloading PDF");
                }
                fs.unlinkSync(filePath);
            });
        });

    } catch (error) {
        console.log("Error generating sales report PDF", error);
        res.status(500).json({ success: false, message: "Internal server error" });
    }
};





  
module.exports = { loadReturn,rejectReturn,approveReturn,getSalesReport,getSalesReportPDF };
