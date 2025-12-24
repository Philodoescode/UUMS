const { User, StaffBenefits, BenefitsAuditLog } = require('../models');

// @desc    Get authenticated user's own benefits
// @route   GET /api/staff/my-benefits
// @access  Private (Instructor/TA only)
const getMyBenefits = async (req, res) => {
    try {
        const userId = req.user.id;

        const benefits = await StaffBenefits.findOne({
            where: { userId },
            include: [
                {
                    model: BenefitsAuditLog,
                    as: 'auditLogs',
                    limit: 1,
                    order: [['createdAt', 'DESC']],
                    include: [
                        {
                            model: User,
                            as: 'changedBy',
                            attributes: ['id', 'fullName', 'email']
                        }
                    ]
                }
            ]
        });

        if (!benefits) {
            return res.status(200).json({
                success: true,
                data: null,
                message: 'No benefits record found. Please contact HR for assistance.'
            });
        }

        // Check if benefits are expired and update status if necessary
        const today = new Date();
        const endDate = new Date(benefits.validityEndDate);
        if (benefits.status === 'active' && endDate < today) {
            await benefits.update({ status: 'expired' });
        }

        const benefitsData = benefits.toJSON();

        // Calculate if coverage is currently active
        const startDate = new Date(benefits.validityStartDate);
        benefitsData.isCoverageActive = startDate <= today && endDate >= today;

        // Get last update info
        if (benefitsData.auditLogs && benefitsData.auditLogs.length > 0) {
            benefitsData.lastUpdatedAt = benefitsData.auditLogs[0].createdAt;
            benefitsData.lastUpdatedBy = benefitsData.auditLogs[0].changedBy;
        }

        res.status(200).json({
            success: true,
            data: benefitsData
        });
    } catch (error) {
        console.error('Error fetching my benefits:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to fetch benefits',
            error: error.message
        });
    }
};

module.exports = {
    getMyBenefits
};
