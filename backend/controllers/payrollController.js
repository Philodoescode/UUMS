const { Compensation, Payslip, User, Department, Instructor } = require('../models');
const PDFDocument = require('pdfkit');

// Helper to seed history for demo purposes
// In a real system, a payroll batch job would create these monthly.
// Helper to ensure history is up to date (Auto-sync)
const ensureSalaryHistoryIsCurrent = async (userId, currentComp) => {
    const count = await Payslip.count({ where: { userId } });
    if (count > 0) return;

    if (!currentComp) return;

    const user = await User.findByPk(userId);
    if (!user) return;

    // Start from creation date or at most 1 year ago (to avoid generating 10 years for old accounts in this demo)
    const createdAt = new Date(user.createdAt);
    let iteratorDate = new Date(createdAt.getFullYear(), createdAt.getMonth() + 1, 1); // Start next month after creation

    // If created this month, no history to seed
    const today = new Date();
    const lastMonthDate = new Date(today.getFullYear(), today.getMonth(), 0); // Last day of previous month

    // Safety: limit to 12 months max for demo
    const oneYearAgo = new Date();
    oneYearAgo.setFullYear(oneYearAgo.getFullYear() - 1);
    if (iteratorDate < oneYearAgo) iteratorDate = oneYearAgo;

    const slips = [];

    while (iteratorDate <= lastMonthDate) {
        const month = iteratorDate.getMonth() + 1; // 1-12
        const year = iteratorDate.getFullYear();

        // Calculate Net
        const totalEarnings = parseFloat(currentComp.baseSalary) +
            parseFloat(currentComp.housingAllowance) +
            parseFloat(currentComp.transportAllowance) +
            parseFloat(currentComp.bonuses);

        const totalDeductions = parseFloat(currentComp.taxDeduction) +
            parseFloat(currentComp.insuranceDeduction) +
            parseFloat(currentComp.unpaidLeaveDeduction) +
            parseFloat(currentComp.otherDeductions);

        const net = Math.max(0, totalEarnings - totalDeductions);

        slips.push({
            userId,
            month,
            year,
            baseSalary: currentComp.baseSalary,
            housingAllowance: currentComp.housingAllowance,
            transportAllowance: currentComp.transportAllowance,
            bonuses: currentComp.bonuses,
            taxDeduction: currentComp.taxDeduction,
            insuranceDeduction: currentComp.insuranceDeduction,
            unpaidLeaveDeduction: currentComp.unpaidLeaveDeduction,
            otherDeductions: currentComp.otherDeductions,
            netSalary: net,
            paymentDate: new Date(year, month, 1), // 1st of the next month
            status: 'processed'
        });

        // Move to next month
        iteratorDate.setMonth(iteratorDate.getMonth() + 1);
    }

    if (slips.length > 0) {
        await Payslip.bulkCreate(slips);
    }
};

// @desc    Get current compensation/salary slip
// @route   GET /api/payroll/current
// @access  Private (Instructor/TA)
const getCurrentCompensation = async (req, res) => {
    try {
        const compensation = await Compensation.findOne({
            where: { userId: req.user.id },
            include: [{
                model: User,
                as: 'user',
                attributes: ['fullName', 'email', 'id', 'createdAt']
            }]
        });

        if (!compensation) {
            return res.status(404).json({
                success: false,
                message: 'No compensation record found. Please contact HR.'
            });
        }

        // Calculate Net
        const totalEarnings = parseFloat(compensation.baseSalary) +
            parseFloat(compensation.housingAllowance) +
            parseFloat(compensation.transportAllowance) +
            parseFloat(compensation.bonuses);

        const totalDeductions = parseFloat(compensation.taxDeduction) +
            parseFloat(compensation.insuranceDeduction) +
            parseFloat(compensation.unpaidLeaveDeduction) +
            parseFloat(compensation.otherDeductions);

        const netSalary = totalEarnings - totalDeductions;

        // Ensure history is up to date (Auto-sync)
        await ensureSalaryHistoryIsCurrent(req.user.id, compensation);

        // Calculate accurate YTD (Sum of all payslips this year + current potential earnings)
        const currentYear = new Date().getFullYear();
        const pastSlips = await Payslip.findAll({
            where: {
                userId: req.user.id,
                year: currentYear
            }
        });

        const ytdEarningsFromHistory = pastSlips.reduce((acc, slip) => {
            return acc + parseFloat(slip.baseSalary) +
                parseFloat(slip.housingAllowance) +
                parseFloat(slip.transportAllowance) +
                parseFloat(slip.bonuses);
        }, 0);

        const ytdEarnings = ytdEarningsFromHistory + totalEarnings;

        const data = {
            ...compensation.toJSON(),
            totalEarnings,
            totalDeductions,
            netSalary,
            ytdEarnings
        };

        res.status(200).json({
            success: true,
            data
        });
    } catch (error) {
        console.error('Error fetching current compensation:', error);
        res.status(500).json({
            success: false,
            message: 'Server Error',
            error: error.message
        });
    }
};

// @desc    Get salary history
// @route   GET /api/payroll/history
// @access  Private (Instructor/TA)
const getSalaryHistory = async (req, res) => {
    try {
        const history = await Payslip.findAll({
            where: { userId: req.user.id },
            order: [['year', 'DESC'], ['month', 'DESC']]
        });

        res.status(200).json({
            success: true,
            count: history.length,
            data: history
        });
    } catch (error) {
        console.error('Error fetching salary history:', error);
        res.status(500).json({
            success: false,
            message: 'Server Error',
            error: error.message
        });
    }
};

// @desc    Download Payslip PDF
// @route   GET /api/payroll/download/:id
// @access  Private (Instructor/TA)
const downloadPayslipPDF = async (req, res) => {
    try {
        const { id } = req.params;
        let payslip;
        let isCurrent = id === 'current';

        if (isCurrent) {
            // Generate slip based on current compensation
            const comp = await Compensation.findOne({
                where: { userId: req.user.id },
                include: [{ model: User, as: 'user' }]
            });

            if (!comp) {
                return res.status(404).json({ success: false, message: 'No compensation data found' });
            }

            const now = new Date();
            payslip = {
                month: now.getMonth() + 1,
                year: now.getFullYear(),
                paymentDate: new Date(now.getFullYear(), now.getMonth() + 1, 1), // 1st of next month
                user: comp.user,
                baseSalary: comp.baseSalary,
                housingAllowance: comp.housingAllowance,
                transportAllowance: comp.transportAllowance,
                bonuses: comp.bonuses,
                taxDeduction: comp.taxDeduction,
                insuranceDeduction: comp.insuranceDeduction,
                unpaidLeaveDeduction: comp.unpaidLeaveDeduction,
                otherDeductions: comp.otherDeductions
            };
        } else {
            payslip = await Payslip.findOne({
                where: { id, userId: req.user.id },
                include: [{ model: User, as: 'user' }]
            });
        }

        if (!payslip && !isCurrent) {
            return res.status(404).json({ success: false, message: 'Payslip not found' });
        }

        // ensure user data is present if it wasn't populated in history fetch (though we included it above)
        // If payslip comes from DB, it has 'user' included.

        // Calculate totals
        const earnings = [
            { label: 'Base Salary', amount: parseFloat(payslip.baseSalary) },
            { label: 'Housing Allowance', amount: parseFloat(payslip.housingAllowance) },
            { label: 'Transport Allowance', amount: parseFloat(payslip.transportAllowance) },
            { label: 'Bonuses', amount: parseFloat(payslip.bonuses) },
        ];
        const deductions = [
            { label: 'Tax', amount: parseFloat(payslip.taxDeduction) },
            { label: 'Insurance', amount: parseFloat(payslip.insuranceDeduction) },
            { label: 'Unpaid Leave', amount: parseFloat(payslip.unpaidLeaveDeduction) },
            { label: 'Other', amount: parseFloat(payslip.otherDeductions) },
        ];

        const totalEarnings = earnings.reduce((acc, curr) => acc + curr.amount, 0);
        const totalDeductions = deductions.reduce((acc, curr) => acc + curr.amount, 0);
        const netSalary = totalEarnings - totalDeductions;
        const monthName = new Date(payslip.year, payslip.month - 1).toLocaleString('default', { month: 'long' });

        // Generate PDF
        const doc = new PDFDocument();

        res.setHeader('Content-Type', 'application/pdf');
        res.setHeader('Content-Disposition', `attachment; filename=Payslip_${payslip.year}_${payslip.month}.pdf`);

        doc.pipe(res);

        // Header
        doc.fontSize(20).text('Salary Slip', { align: 'center' });
        doc.moveDown();
        doc.fontSize(12).text(`University Management System`, { align: 'center' });
        doc.moveDown();
        doc.text(`Period: ${monthName} ${payslip.year}`, { align: 'center' });
        doc.text(`Employee: ${req.user.fullName} (${req.user.email})`, { align: 'center' });
        doc.moveDown();

        // Table-like structure
        const yStart = doc.y;
        doc.text('Earnings', 50, yStart, { underline: true });
        doc.text('Amount', 200, yStart, { underline: true, align: 'right' });

        doc.text('Deductions', 300, yStart, { underline: true });
        doc.text('Amount', 450, yStart, { underline: true, align: 'right' });

        let y = yStart + 20;

        // Render rows
        const maxRows = Math.max(earnings.length, deductions.length);
        for (let i = 0; i < maxRows; i++) {
            if (earnings[i]) {
                doc.text(earnings[i].label, 50, y);
                doc.text(earnings[i].amount.toFixed(2), 200, y, { align: 'right' });
            }
            if (deductions[i]) {
                doc.text(deductions[i].label, 300, y);
                doc.text(deductions[i].amount.toFixed(2), 450, y, { align: 'right' });
            }
            y += 20;
        }

        doc.moveDown();
        doc.moveTo(50, y).lineTo(500, y).stroke();
        y += 10;

        doc.font('Helvetica-Bold');
        doc.text('Total Earnings:', 50, y);
        doc.text(totalEarnings.toFixed(2), 200, y, { align: 'right' });

        doc.text('Total Deductions:', 300, y);
        doc.text(totalDeductions.toFixed(2), 450, y, { align: 'right' });

        y += 30;
        doc.fontSize(14).text('Net Salary:', 50, y);
        doc.text(netSalary.toFixed(2), 200, y, { align: 'right' }); // Just aligning relative to earnings column for cleaner look or 450? 
        // Let's center net salary or put it prominently

        doc.end();

    } catch (error) {
        console.error('Error generating PDF:', error);
        if (!res.headersSent) {
            res.status(500).json({ success: false, message: 'Error generating PDF' });
        }
    }
};

module.exports = {
    getCurrentCompensation,
    getSalaryHistory,
    downloadPayslipPDF
};
