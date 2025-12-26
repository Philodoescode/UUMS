const { AdmissionApplication, User, Role, UserRole } = require('../models');
const bcrypt = require('bcryptjs');

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

// @desc    Get all admission applications (with optional status filter)
// @route   GET /api/applications
// @access  Admin
const getAllApplications = async (req, res) => {
    try {
        const { status } = req.query;
        let whereClause = {};
        
        if (status) {
            whereClause.status = status;
        }

        const applications = await AdmissionApplication.findAll({
            where: whereClause,
            order: [['createdAt', 'DESC']]
        });

        res.status(200).json(applications);
    } catch (error) {
        console.error('Error getting applications:', error);
        res.status(500).json({ message: 'Server error', error: error.message });
    }
};

// @desc    Get single admission application by ID
// @route   GET /api/applications/:id
// @access  Admin
const getApplicationById = async (req, res) => {
    try {
        const application = await AdmissionApplication.findByPk(req.params.id);

        if (!application) {
            return res.status(404).json({ message: 'Application not found' });
        }

        res.status(200).json(application);
    } catch (error) {
        console.error('Error getting application:', error);
        res.status(500).json({ message: 'Server error', error: error.message });
    }
};

// @desc    Update application status
// @route   PUT /api/applications/:id/status
// @access  Admin
const updateApplicationStatus = async (req, res) => {
    try {
        const { status } = req.body;
        const { id } = req.params;

        if (!['Submitted', 'Under Review', 'Accepted', 'Rejected'].includes(status)) {
            return res.status(400).json({ message: 'Invalid status' });
        }

        const application = await AdmissionApplication.findByPk(id);

        if (!application) {
            return res.status(404).json({ message: 'Application not found' });
        }

        // If status is changing to Accepted, create student user account
        if (status === 'Accepted' && application.status !== 'Accepted') {
            // Check if user already exists
            const userExists = await User.findOne({ where: { email: application.email } });
            
            if (userExists) {
                // If user exists, we might just want to update status but alert admin? 
                // For now, let's proceed but maybe not create a new user, or throw error?
                // The requirement says "creates a standard User account... automatically".
                // If duplicates are found, it's safer to not crash but maybe log or return info.
                // However, since email should be unique in User model, we can't create another one.
                console.log(`User with email ${application.email} already exists. Skipping user creation.`);
            } else {
                // Get Student Role
                const studentRole = await Role.findOne({ where: { name: 'student' } });
                
                if (!studentRole) {
                    return res.status(500).json({ message: 'System configuration error: Student role not found' });
                }

                // Generate default password (e.g., "password123")
                const salt = await bcrypt.genSalt(10);
                const hashedPassword = await bcrypt.hash('password123', salt);

                // Create user without roleId (multi-role pattern)
                const newUser = await User.create({
                    fullName: application.name,
                    email: application.email,
                    password: hashedPassword,
                    isActive: true
                });

                // Assign student role through UserRole join table
                await UserRole.create({
                    userId: newUser.id,
                    roleId: studentRole.id
                });
            }
        }

        application.status = status;
        await application.save();

        res.status(200).json({
            message: `Application status updated to ${status}`,
            application,
        });

    } catch (error) {
        console.error('Error updating application status:', error);
        res.status(500).json({ message: 'Server error', error: error.message });
    }
};

module.exports = {
    createApplication,
    getAllApplications,
    getApplicationById,
    updateApplicationStatus,
};
