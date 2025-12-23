const { User, Role } = require('../models');
const bcrypt = require('bcryptjs');

// @desc    Create a new user (Admin only)
// @route   POST /api/users
const createUser = async (req, res) => {
    try {
        const { fullName, email, role, password } = req.body;

        // Validation
        if (!fullName || !email || !role) {
            return res.status(400).json({ message: 'Please provide all required fields' });
        }

        // Check if user exists
        const userExists = await User.findOne({ where: { email } });
        if (userExists) {
            return res.status(400).json({ message: 'User already exists' });
        }

        // Validate Role (TA or Instructor)
        const roleLower = role.toLowerCase();
        const roleDoc = await Role.findOne({ where: { name: roleLower } });
        if (!roleDoc) {
            return res.status(400).json({ message: 'Invalid role' });
        }

        if (!['TA', 'Instructor'].includes(role) && req.user.role.name !== 'admin') {
            // Note: Depending on requirements, admin might want to create other admins too, 
            // but spec says "staff accounts (TA and Instructor)".
            // For now, let's allow creating any role if the role exists in DB, 
            // but maybe restrict strictly to TA/Instructor if strictly requested.
            // "The Admin must select the appropriate Role (either "TA" or "Instructor")"
            // I will enforce TA or Instructor for now to be safe, or just check roleDoc.
        }

        // Strict requirement: "The Admin must select the appropriate Role (either "TA" or "Instructor")"
        if (!['ta', 'instructor', 'hr'].includes(roleLower)) {
            return res.status(400).json({ message: 'Role must be either TA, Instructor, or HR' });
        }

        // Hash password (default or provided)
        // Plan said "default password", but let's allow providing one if sent, else default.
        const plainPassword = password || 'password123';
        const salt = await bcrypt.genSalt(10);
        const hashedPassword = await bcrypt.hash(plainPassword, salt);

        // Create user
        const user = await User.create({
            fullName,
            email,
            password: hashedPassword,
            roleId: roleDoc.id,
            createdById: req.user.id
        });

        if (user) {
            res.status(201).json({
                _id: user.id,
                fullName: user.fullName,
                email: user.email,
                role: roleDoc.name,
            });
        } else {
            res.status(400).json({ message: 'Invalid user data' });
        }

    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Server error' });
    }
};

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

// @desc    Get faculty members (Instructors and TAs) - accessible by any authenticated user
// @route   GET /api/users/faculty
const getFacultyMembers = async (req, res) => {
    try {
        // Find instructor and TA role IDs
        const instructorRole = await Role.findOne({ where: { name: 'instructor' } });
        const taRole = await Role.findOne({ where: { name: 'ta' } });

        if (!instructorRole && !taRole) {
            return res.json([]);
        }

        const roleIds = [];
        if (instructorRole) roleIds.push(instructorRole.id);
        if (taRole) roleIds.push(taRole.id);

        const { Op } = require('sequelize');
        
        const faculty = await User.findAll({
            where: {
                roleId: { [Op.in]: roleIds }
            },
            include: [
                { model: Role, as: 'role', attributes: ['name'] }
            ],
            attributes: ['id', 'fullName', 'email']
        });

        res.json(faculty);
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Server error' });
    }
};

// @desc    Get a single user by ID - accessible by any authenticated user
// @route   GET /api/users/:id
const getUserById = async (req, res) => {
    try {
        const { id } = req.params;
        
        const user = await User.findByPk(id, {
            include: [
                { model: Role, as: 'role', attributes: ['name'] }
            ],
            attributes: ['id', 'fullName', 'email']
        });

        if (!user) {
            return res.status(404).json({ message: 'User not found' });
        }

        res.json(user);
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Server error' });
    }
};

module.exports = {
    getAllUsers,
    assignAdvisor,
    createUser,
    getFacultyMembers,
    getUserById
};
