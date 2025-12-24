const { Instructor, User, Department, Role } = require('../models');

// @desc    Get current user's instructor profile
// @route   GET /api/profile/self
const getMyProfile = async (req, res) => {
    try {
        // Check if user is an instructor or TA
        if (req.user.role.name !== 'instructor' && req.user.role.name !== 'ta') {
            return res.status(403).json({ message: 'Only instructors can access this endpoint' });
        }

        const instructor = await Instructor.findOne({
            where: { userId: req.user.id },
            include: [
                { model: User, as: 'user', attributes: ['id', 'fullName', 'email'] },
                { model: Department, as: 'department' },
            ],
        });

        if (!instructor) {
            return res.status(404).json({ message: 'Instructor profile not found' });
        }

        res.json(instructor);
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Server error' });
    }
};

// @desc    Update current user's instructor profile
// @route   PATCH /api/profile/self
const updateMyProfile = async (req, res) => {
    try {
        // Check if user is an instructor or TA
        if (req.user.role.name !== 'instructor' && req.user.role.name !== 'ta') {
            return res.status(403).json({ message: 'Only instructors can access this endpoint' });
        }

        const instructor = await Instructor.findOne({
            where: { userId: req.user.id },
        });

        if (!instructor) {
            return res.status(404).json({ message: 'Instructor profile not found' });
        }

        // Only allow updating these specific fields (user-managed)
        const { officeLocation, officeHours, awards } = req.body;

        // Validate awards format if provided
        if (awards !== undefined) {
            if (!Array.isArray(awards)) {
                return res.status(400).json({ message: 'Awards must be an array' });
            }
            for (const award of awards) {
                if (!award.title || typeof award.title !== 'string') {
                    return res.status(400).json({ message: 'Each award must have a title' });
                }
            }
        }

        await instructor.update({
            officeLocation: officeLocation !== undefined ? officeLocation : instructor.officeLocation,
            officeHours: officeHours !== undefined ? officeHours : instructor.officeHours,
            awards: awards !== undefined ? awards : instructor.awards,
        });

        // Fetch updated profile with associations
        const updatedInstructor = await Instructor.findOne({
            where: { userId: req.user.id },
            include: [
                { model: User, as: 'user', attributes: ['id', 'fullName', 'email'] },
                { model: Department, as: 'department' },
            ],
        });

        res.json(updatedInstructor);
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Server error' });
    }
};

module.exports = {
    getMyProfile,
    updateMyProfile,
};
