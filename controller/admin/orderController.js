const PDFDocument = require('pdfkit'); 
const path = require('path'); 
const fs = require('fs');
const xlsx = require("xlsx");
const Product = require('../../models/productSchema');
const Category=require('../../models/categorySchema')
const User=require('../../models/userSchema')
const Coupon=require('../../models/couponSchema')
const Order=require('../../models/orderSchema')
const Wallet = require("../../models/walletSchema");
const {calculateRefundAmount,calculateOverallOrderStatus}=require('../../helpers/priceHelper')

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


const loadProductReturn = async (req, res) => {
  try {

    const returnOrders = await Order.find({
      'order_items.itemStatus': 'returnRequested'
    })
      .populate('userId', 'name email')
      .populate('order_items.productId', 'image name'); 

    const productReturnRequests = [];

    returnOrders.forEach(order => {
      order.order_items.forEach(item => {
        if (item.itemStatus === 'returnRequested') {
          productReturnRequests.push({
            orderId: order.orderId,
            user: order.userId,
            productId: item.productId._id,
            productName: item.productName, 
            productImage: item.productId.image,
            returnReason: item.returnReason,
            price: item.price,
            quantity: item.quantity
          });
        }
      });
    });

    res.render('returnProduct-request', { productReturnRequests });

  } catch (error) {
    console.error('Error loading product return requests:', error);
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

        let dateFilter = {};
        if (fromDate && toDate) {
            dateFilter.invoiceDate = {
                $gte: new Date(fromDate),
                $lte: new Date(toDate)
            };
        } else {
            const today = new Date();
            if (filterBy === "daily") {
                dateFilter.invoiceDate = {
                    $gte: new Date(today.setHours(0, 0, 0, 0)),
                    $lte: new Date()
                };
            } else if (filterBy === "weekly") {
                const lastWeek = new Date();
                lastWeek.setDate(lastWeek.getDate() - 7);
                dateFilter.invoiceDate = { $gte: lastWeek, $lte: new Date() };
            } else if (filterBy === "monthly") {
                const lastMonth = new Date();
                lastMonth.setMonth(lastMonth.getMonth() - 1);
                dateFilter.invoiceDate = { $gte: lastMonth, $lte: new Date() };
            }
        }

        // Count total delivered orders
        const totalOrdersCount = await Order.countDocuments({
            ...dateFilter,
            'order_items.itemStatus': 'delivered'
        });

        // Calculate total revenue for delivered items
        const totalSales = await Order.aggregate([
            { $match: dateFilter },
            { $unwind: '$order_items' },
            { $match: { 'order_items.itemStatus': 'delivered' } },
            {
                $group: {
                    _id: null,
                    totalRevenue: { $sum: { $multiply: ['$order_items.price', '$order_items.quantity'] } }
                }
            }
        ]);
        const totalRevenue = totalSales.length > 0 ? totalSales[0].totalRevenue : 0;

        // Fetch orders with delivered items for pagination
        const orderIdsWithDeliveredItems = await Order.aggregate([
            { $match: dateFilter },
            { $unwind: '$order_items' },
            { $match: { 'order_items.itemStatus': 'delivered' } },
            { $group: { _id: '$_id' } },
            { $sort: { _id: -1 } },
            { $skip: skip },
            { $limit: limit }
        ]);

        // Retrieve full order details
        const orders = await Order.find({
            _id: { $in: orderIdsWithDeliveredItems.map(o => o._id) }
        })
            .populate('userId', 'name email phone')
            .populate('order_items.productId', 'productName price')
            .sort({ invoiceDate: -1 })
            .lean();

        // Compute delivered revenue per order
        const ordersWithDeliveredRevenue = orders.map(order => ({
            ...order,
            deliveredRevenue: order.order_items
                .filter(item => item.itemStatus === 'delivered')
                .reduce((sum, item) => sum + item.price * item.quantity, 0)
        }));

        res.render('sales-report', {
            orders: ordersWithDeliveredRevenue,
            totalRevenue,
            totalOrders: totalOrdersCount,
            currentPage: page,
            totalPages: Math.ceil(totalOrdersCount / limit),
            filterBy,
            fromDate,
            toDate
        });

    } catch (error) {
        console.error("Error fetching sales report:", error);
        res.status(500).json({ success: false, message: "Internal Server Error" });
    }
};



const getSalesReportPDF = async (req, res) => {
    try {
        const { filterBy, fromDate, toDate } = req.query;
        
        let dateFilter = {};
        if (fromDate && toDate) {
            dateFilter = {
                invoiceDate: {
                    $gte: new Date(fromDate),
                    $lte: new Date(toDate)
                }
            };
        } else {
            const today = new Date();
            if (filterBy === "daily") {
                dateFilter = {
                    invoiceDate: {
                        $gte: new Date(today.setHours(0, 0, 0, 0)),
                        $lte: new Date()
                    }
                };
            } else if (filterBy === "weekly") {
                const lastWeek = new Date();
                lastWeek.setDate(lastWeek.getDate() - 7);
                dateFilter = {
                    invoiceDate: {
                        $gte: lastWeek,
                        $lte: new Date()
                    }
                };
            } else if (filterBy === "monthly") {
                const lastMonth = new Date();
                lastMonth.setMonth(lastMonth.getMonth() - 1);
                dateFilter = {
                    invoiceDate: {
                        $gte: lastMonth,
                        $lte: new Date()
                    }
                };
            }
        }

        const orderIdsWithDeliveredItems = await Order.aggregate([
            { $match: dateFilter },
            { $unwind: '$order_items' },
            { $match: { 'order_items.itemStatus': 'delivered' } },
            { $group: { _id: '$_id' } },
            { $sort: { _id: -1 } }
        ]);

        const orders = await Order.find({
            _id: { $in: orderIdsWithDeliveredItems.map(o => o._id) }
        })
            .populate('userId', 'name email phone')
            .populate('order_items.productId', 'productName price')
            .sort({ invoiceDate: -1 });

        let totalRevenue = 0;
        let totalDiscount = 0;
        orders.forEach(order => {
            const deliveredItems = order.order_items.filter(item => item.itemStatus === 'delivered');
            deliveredItems.forEach(item => {
                totalRevenue += item.price * item.quantity;
            });
            totalDiscount += order.discount || 0; // Ensure discount is added if it exists
        });

        const totalOrders = orders.length;

        const doc = new PDFDocument({
            margin: 50,
            size: 'A4'
        });
        const filePath = path.join(__dirname, '../publics/sales_report.pdf');
        const stream = fs.createWriteStream(filePath);
        doc.pipe(stream);

        doc.fontSize(24)
           .font('Helvetica-Bold')
           .text('Filmatic', { align: 'center' })
           .moveDown(0.5);

        doc.fontSize(16)
           .font('Helvetica')
           .text('Sales Report (Delivered Items Only)', { align: 'center' })
           .moveDown(0.5);

        doc.fontSize(10)
           .text(`Generated on: ${new Date().toLocaleDateString('en-US', {
               year: 'numeric',
               month: 'long',
               day: 'numeric'
           })}`, { align: 'center' })
           .moveDown(1);

        doc.rect(50, doc.y, 500, 80).stroke();  // Increased height for discount
        doc.fontSize(12)
           .text('Summary', 60, doc.y + 10)
           .fontSize(10)
           .text(`Total Orders with Delivered Items: ${totalOrders}`, 60, doc.y + 5)
           .text(`Total Revenue from Delivered Items: ₹${totalRevenue.toLocaleString()}.00`, 60, doc.y + 5)
           .text(`Total Discount Given: ₹${totalDiscount.toLocaleString()}.00`, 60, doc.y + 5) // Added discount
           .moveDown(2);

        const tableTop = doc.y;
        const tableHeaders = ['Order ID', 'Date', 'Customer Name', 'Delivered', 'Discount', 'Revenue'];
        const columnWidths = [90, 80, 130, 70, 60, 70];
        let xPosition = 50;

        doc.rect(50, tableTop, 500, 20).fill('#f0f0f0');

        doc.font('Helvetica-Bold').fontSize(10);
        tableHeaders.forEach((header, i) => {
            doc.fillColor('black')
               .text(header, xPosition, tableTop + 5, {
                   width: columnWidths[i],
                   align: ['Revenue', 'Discount'].includes(header) ? 'right' : 'left'
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
                           align: ['Revenue', 'Discount'].includes(header) ? 'right' : 'left'
                       });
                    xPosition += columnWidths[i];
                });
                doc.font('Helvetica').fontSize(9);
                yPosition += 25;
            }

            if (index % 2 === 0) {
                doc.rect(50, yPosition - 5, 500, 20).fill('#f9f9f9');
            }

            const deliveredItems = order.order_items.filter(item => item.itemStatus === 'delivered');
            const orderRevenue = deliveredItems.reduce((sum, item) => sum + (item.price * item.quantity), 0);
            const orderDiscount = order.discount || 0; // Added discount field

            xPosition = 50;
            doc.fillColor('black')
               .text(order._id.toString().slice(-8), xPosition, yPosition, {
                   width: columnWidths[0]
               });

            xPosition += columnWidths[0];
            doc.text(new Date(order.invoiceDate).toLocaleDateString(), xPosition, yPosition, {
                width: columnWidths[1]
            });

            xPosition += columnWidths[1];
            doc.text(order.userId.name, xPosition, yPosition, {
                width: columnWidths[2]
            });

            xPosition += columnWidths[2];
            doc.text(`${deliveredItems.length}/${order.order_items.length}`, xPosition, yPosition, {
                width: columnWidths[3]
            });

            xPosition += columnWidths[3];
            doc.text(`₹${orderDiscount.toLocaleString()}.00`, xPosition, yPosition, { // Added discount
                width: columnWidths[4],
                align: 'right'
            });

            xPosition += columnWidths[4];
            doc.text(`₹${orderRevenue.toLocaleString()}.00`, xPosition, yPosition, {
                width: columnWidths[5],
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




const getSalesReportExcel = async (req, res) => {
    try {
        const { filterBy, fromDate, toDate } = req.query;

        let dateFilter = {};
        if (fromDate && toDate) {
            dateFilter = {
                invoiceDate: {
                    $gte: new Date(fromDate),
                    $lte: new Date(toDate)
                }
            };
        } else {
            const today = new Date();
            if (filterBy === "daily") {
                dateFilter = {
                    invoiceDate: {
                        $gte: new Date(today.setHours(0, 0, 0, 0)),
                        $lte: new Date()
                    }
                };
            } else if (filterBy === "weekly") {
                const lastWeek = new Date();
                lastWeek.setDate(lastWeek.getDate() - 7);
                dateFilter = {
                    invoiceDate: {
                        $gte: lastWeek,
                        $lte: new Date()
                    }
                };
            } else if (filterBy === "monthly") {
                const lastMonth = new Date();
                lastMonth.setMonth(lastMonth.getMonth() - 1);
                dateFilter = {
                    invoiceDate: {
                        $gte: lastMonth,
                        $lte: new Date()
                    }
                };
            }
        }

        const orderIdsWithDeliveredItems = await Order.aggregate([
            { $match: dateFilter },
            { $unwind: '$order_items' },
            { $match: { 'order_items.itemStatus': 'delivered' } },
            { $group: { _id: '$_id' } },
            { $sort: { _id: -1 } }
        ]);

        const orders = await Order.find({
            _id: { $in: orderIdsWithDeliveredItems.map(o => o._id) }
        })
            .populate('userId', 'name email phone')
            .populate('order_items.productId', 'productName price')
            .sort({ invoiceDate: -1 });

        let totalRevenue = 0;
        let totalDiscount = 0;

        const reportData = orders.map(order => {
            const deliveredItems = order.order_items.filter(item => item.itemStatus === 'delivered');
            const orderRevenue = deliveredItems.reduce((sum, item) => sum + (item.price * item.quantity), 0);
            const orderDiscount = order.discount || 0;

            totalRevenue += orderRevenue;
            totalDiscount += orderDiscount;

            return {
                "Order ID": order._id.toString().slice(-8),
                "Date": new Date(order.invoiceDate).toLocaleDateString(),
                "Customer Name": order.userId.name,
                "Total Items": order.order_items.length,
                "Delivered Items": deliveredItems.length,
                "Discount (₹)": orderDiscount,
                "Revenue (₹)": orderRevenue
            };
        });

        // Adding summary row at the end
        reportData.push({
            "Order ID": "TOTAL",
            "Date": "",
            "Customer Name": "",
            "Total Items": "",
            "Delivered Items": "",
            "Discount (₹)": totalDiscount,
            "Revenue (₹)": totalRevenue
        });

        // Create a new workbook and worksheet
        const workbook = xlsx.utils.book_new();
        const worksheet = xlsx.utils.json_to_sheet(reportData);

        // Add worksheet to workbook
        xlsx.utils.book_append_sheet(workbook, worksheet, "Sales Report");

        // Define file path
        const filePath = path.join(__dirname, "../publics/sales_report.xlsx");

        // Write file
        xlsx.writeFile(workbook, filePath);

        // Send file as download
        res.download(filePath, "Filmatic_Sales_Report.xlsx", (err) => {
            if (err) {
                console.error("Error downloading Excel:", err);
                res.status(500).send("Error downloading Excel file");
            }
            fs.unlinkSync(filePath); // Delete file after download
        });

    } catch (error) {
        console.log("Error generating sales report Excel", error);
        res.status(500).json({ success: false, message: "Internal server error" });
    }
};



const rejectProductReturn = async (req, res) => {
    try {
        const { orderId, productId, rejectReason } = req.body;

        if (!orderId || !productId || !rejectReason) {
            return res.status(400).json({ success: false, message: "Required fields not found." });
        }

        const order = await Order.findOne({ orderId });

        if (!order) {
            return res.status(404).json({ success: false, message: "Order not found." });
        }

        const productItem = order.order_items.find(item => item.productId.toString() === productId);

        if (!productItem) {
            return res.status(404).json({ success: false, message: "Product not found in order." });
        }

        productItem.itemStatus = "returnRejected";

        await order.save();

        return res.status(200).json({ success: true, message: "Return request rejected successfully." });

    } catch (error) {
        console.error("Error rejecting return:", error);
        return res.status(500).json({ success: false, message: "Internal server error." });
    }
};


const approveProductReturn = async (req, res) => {
    try {
        const { orderId, productId } = req.body;

        if (!orderId || !productId) {
            return res.status(400).json({ success: false, message: "Required fields not found." });
        }

        const order = await Order.findOne({ orderId });

        if (!order) {
            return res.status(404).json({ success: false, message: "Order not found." });
        }

        const productItem = order.order_items.find(item => item.productId.toString() === productId);

        if (!productItem) {
            return res.status(404).json({ success: false, message: "Product not found in order." });
        }

        if (productItem.itemStatus !== "returnRequested") {
            return res.status(400).json({ success: false, message: "Return request not found for this product." });
        }

        const refundAmount = await calculateRefundAmount(order, productId);

        let wallet = await Wallet.findOne({ userId: order.userId });

        if (!wallet) {
            wallet = new Wallet({
                userId: order.userId,
                balance: 0,
                transactions: []
            });
        }

        wallet.balance += refundAmount;
        wallet.transactions.push({
            amount: refundAmount,
            type: "credit",
            description: `Refund for returned product ${productId}`,
            date: new Date()
        });

        await wallet.save();

        productItem.itemStatus = "returned";

        const overallOrderStatus = await calculateOverallOrderStatus(order);

        order.status = overallOrderStatus;

        await order.save();

        return res.status(200).json({
            success: true,
            message: "Product return approved and refund processed.",
        });

    } catch (error) {
        console.error("Error approving product return:", error);
        return res.status(500).json({ success: false, message: "Internal server error." });
    }
};

  
module.exports = { loadReturn,loadProductReturn,rejectReturn,approveReturn,rejectProductReturn,approveProductReturn,getSalesReport,getSalesReportPDF,getSalesReportExcel };
