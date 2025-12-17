const { MaintenanceRequest, Facility, User } = require('../models');

// @desc    Create a new maintenance request
// @route   POST /api/maintenance
const createRequest = async (req, res) => {
    try {
        const { facilityId, description, severity } = req.body;

        if (!facilityId || !description) {
            return res.status(400).json({ message: 'Facility and description are required' });
        }

        const request = await MaintenanceRequest.create({
            facilityId,
            reportedById: req.user.id,
            description,
            severity: severity || 'Low',
        });

        res.status(201).json(request);
    } catch (error) {
        console.error('Error creating maintenance request:', error);
        res.status(500).json({ message: 'Server error' });
    }
};

// @desc    Get all maintenance requests (Admin) or my requests (Instructor)
// @route   GET /api/maintenance
const getRequests = async (req, res) => {
    try {
        const where = {};

        // If not admin, only show own requests
        if (req.user.role.name !== 'admin') {
            where.reportedById = req.user.id;
        }

        const requests = await MaintenanceRequest.findAll({
            where,
            include: [
                {
                    model: Facility,
                    attributes: ['id', 'name', 'code', 'building', 'floor'],
                },
                {
                    model: User,
                    as: 'reportedBy',
                    attributes: ['id', 'fullName', 'email'],
                },
            ],
            order: [['createdAt', 'DESC']],
        });

        res.json(requests);
    } catch (error) {
        console.error('Error fetching maintenance requests:', error);
        res.status(500).json({ message: 'Server error' });
    }
};

// @desc    Update request status
// @route   PATCH /api/maintenance/:id/status
const updateStatus = async (req, res) => {
    try {
        const { status } = req.body;
        const { id } = req.params;

        if (!['Reported', 'In Progress', 'Resolved'].includes(status)) {
            return res.status(400).json({ message: 'Invalid status' });
        }

        const request = await MaintenanceRequest.findByPk(id);

        if (!request) {
            return res.status(404).json({ message: 'Request not found' });
        }

        request.status = status;
        await request.save();

        res.json(request);
    } catch (error) {
        console.error('Error updating maintenance request:', error);
        res.status(500).json({ message: 'Server error' });
    }
};

module.exports = {
    createRequest,
    getRequests,
    updateStatus,
};
