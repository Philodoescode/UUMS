const { LeaveRequest, User } = require('../models');

// @desc    Submit a new leave request
// @route   POST /api/leave-requests
// @access  Private (Instructor/TA)
const submitLeaveRequest = async (req, res) => {
    try {
        const { leaveType, startDate, endDate, reason } = req.body;
        const userId = req.user.id;

        // Validate required fields
        if (!leaveType || !startDate || !endDate || !reason) {
            return res.status(400).json({
                message: 'All fields are required: leaveType, startDate, endDate, reason'
            });
        }

        // Validate dates
        const start = new Date(startDate);
        const end = new Date(endDate);

        if (start > end) {
            return res.status(400).json({
                message: 'End date must be after or equal to start date'
            });
        }

        // Create the leave request
        const leaveRequest = await LeaveRequest.create({
            userId,
            leaveType,
            startDate,
            endDate,
            reason,
            status: 'pending',
        });

        res.status(201).json({
            message: 'Leave request submitted successfully',
            leaveRequest,
        });
    } catch (error) {
        console.error('Error submitting leave request:', error);
        res.status(500).json({ message: 'Server error' });
    }
};

// @desc    Get current user's leave requests
// @route   GET /api/leave-requests/my
// @access  Private (Instructor/TA)
const getMyLeaveRequests = async (req, res) => {
    try {
        const userId = req.user.id;

        const leaveRequests = await LeaveRequest.findAll({
            where: { userId },
            include: [
                {
                    model: User,
                    as: 'reviewedBy',
                    attributes: ['id', 'fullName', 'email'],
                },
            ],
            order: [['createdAt', 'DESC']],
        });

        res.json(leaveRequests);
    } catch (error) {
        console.error('Error fetching leave requests:', error);
        res.status(500).json({ message: 'Server error' });
    }
};

// @desc    Cancel a pending leave request
// @route   DELETE /api/leave-requests/:id
// @access  Private (Instructor/TA - own requests only)
const cancelLeaveRequest = async (req, res) => {
    try {
        const { id } = req.params;
        const userId = req.user.id;

        const leaveRequest = await LeaveRequest.findByPk(id);

        if (!leaveRequest) {
            return res.status(404).json({ message: 'Leave request not found' });
        }

        // Verify ownership
        if (leaveRequest.userId !== userId) {
            return res.status(403).json({
                message: 'You can only cancel your own leave requests'
            });
        }

        // Can only cancel pending requests
        if (leaveRequest.status !== 'pending') {
            return res.status(400).json({
                message: 'Only pending requests can be cancelled'
            });
        }

        await leaveRequest.destroy();

        res.json({ message: 'Leave request cancelled successfully' });
    } catch (error) {
        console.error('Error cancelling leave request:', error);
        res.status(500).json({ message: 'Server error' });
    }
};

// @desc    Get a single leave request by ID
// @route   GET /api/leave-requests/:id
// @access  Private (Instructor/TA - own requests only)
const getLeaveRequestById = async (req, res) => {
    try {
        const { id } = req.params;
        const userId = req.user.id;

        const leaveRequest = await LeaveRequest.findByPk(id, {
            include: [
                {
                    model: User,
                    as: 'reviewedBy',
                    attributes: ['id', 'fullName', 'email'],
                },
            ],
        });

        if (!leaveRequest) {
            return res.status(404).json({ message: 'Leave request not found' });
        }

        // Verify ownership
        if (leaveRequest.userId !== userId) {
            return res.status(403).json({
                message: 'You can only view your own leave requests'
            });
        }

        res.json(leaveRequest);
    } catch (error) {
        console.error('Error fetching leave request:', error);
        res.status(500).json({ message: 'Server error' });
    }
};

module.exports = {
    submitLeaveRequest,
    getMyLeaveRequests,
    cancelLeaveRequest,
    getLeaveRequestById,
};
