const { ProfessionalDevelopment, User } = require('../models');

// @desc    Create a new PD record
// @route   POST /api/professional-development
// @access  Private (HR only)
const createRecord = async (req, res) => {
    try {
        const { userId, title, type, provider, completionDate, expiryDate, description, credentialUrl } = req.body;

        // Basic Validation
        if (!userId || !title || !type || !completionDate) {
            return res.status(400).json({ message: 'Missing required fields' });
        }

        // Verify User exists
        const user = await User.findByPk(userId);
        if (!user) {
            return res.status(404).json({ message: 'User not found' });
        }

        const record = await ProfessionalDevelopment.create({
            userId,
            title,
            type,
            provider,
            completionDate,
            expiryDate,
            description,
            credentialUrl,
            verified: true, // HR created is verified
            createdBy: req.user.id
        });

        res.status(201).json(record);
    } catch (error) {
        console.error('Error creating PD record:', error);
        res.status(500).json({ message: 'Server error', error: error.message });
    }
};

// @desc    Get PD records for a user
// @route   GET /api/professional-development/user/:userId
// @access  Private (HR or Owner)
const getRecordsByUser = async (req, res) => {
    try {
        const { userId } = req.params;

        // Check permissions: HR or the user themselves
        if (req.user.role.name !== 'hr' && req.user.role.name !== 'admin' && req.user.id !== userId) {
            return res.status(403).json({ message: 'Not authorized to view these records' });
        }

        const records = await ProfessionalDevelopment.findAll({
            where: { userId },
            order: [['completionDate', 'DESC']]
        });

        res.json(records);
    } catch (error) {
        console.error('Error fetching PD records:', error);
        res.status(500).json({ message: 'Server error', error: error.message });
    }
};

// @desc    Delete a PD record
// @route   DELETE /api/professional-development/:id
// @access  Private (HR only)
const deleteRecord = async (req, res) => {
    try {
        const { id } = req.params;

        const record = await ProfessionalDevelopment.findByPk(id);

        if (!record) {
            return res.status(404).json({ message: 'Record not found' });
        }

        await record.destroy();

        res.json({ message: 'Record deleted successfully' });
    } catch (error) {
        console.error('Error deleting PD record:', error);
        res.status(500).json({ message: 'Server error', error: error.message });
    }
};

module.exports = {
    createRecord,
    getRecordsByUser,
    deleteRecord
};
