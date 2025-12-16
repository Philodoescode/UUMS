const { AdmissionApplication } = require('../models');

// @desc    Submit a new admission application
// @route   POST /api/applications
// @access  Public
const createApplication = async (req, res) => {
    try {
        const { name, email, previousEducation, intendedMajor } = req.body;

        // Basic validation
        if (!name || !email || !previousEducation || !intendedMajor) {
            return res.status(400).json({ message: 'All fields are required' });
        }

        const application = await AdmissionApplication.create({
            name,
            email,
            previousEducation,
            intendedMajor,
            status: 'Submitted',
        });

        res.status(201).json({
            message: 'Application submitted successfully',
            application,
        });
    } catch (error) {
        console.error('Error submitting application:', error);
        res.status(500).json({ message: 'Server error', error: error.message });
    }
};

module.exports = {
    createApplication,
};
