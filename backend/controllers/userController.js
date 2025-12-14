const { User, Role } = require('../models');

// @desc    Get all users (with optional role filtering)
// @route   GET /api/users
const getAllUsers = async (req, res) => {
    try {
        const { role } = req.query;
        let where = {};

        if (role) {
            const roleDoc = await Role.findOne({ where: { name: role } });
            if (roleDoc) {
                where.roleId = roleDoc.id;
            } else {
                return res.json([]); // Role not found, return empty
            }
        }

        const users = await User.findAll({
            where,
            include: [
                { model: Role, as: 'role', attributes: ['name'] },
                { model: User, as: 'advisor', attributes: ['id', 'fullName'] }
            ],
            attributes: ['id', 'fullName', 'email']
        });

        res.json(users);
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Server error' });
    }
};

// @desc    Assign advisor to student
// @route   PUT /api/users/:id/advisor
const assignAdvisor = async (req, res) => {
    try {
        const { id } = req.params; // Student ID
        const { advisorId } = req.body;

        const student = await User.findByPk(id);
        if (!student) {
            return res.status(404).json({ message: 'Student not found' });
        }

        // Verify advisor exists
        const advisor = await User.findByPk(advisorId);
        if (!advisor) {
            return res.status(404).json({ message: 'Advisor not found' });
        }

        student.advisorId = advisorId;
        await student.save();

        res.json({ message: 'Advisor assigned successfully', student });

    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Server error' });
    }
};

module.exports = {
    getAllUsers,
    assignAdvisor
};
