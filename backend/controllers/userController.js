const { User, Role, UserRole } = require('../models');
const bcrypt = require('bcryptjs');
const UserProfileEavService = require('../utils/userProfileEavService');
const { Op } = require('sequelize');

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

        // Create user (without roleId - using multi-role pattern)
        const user = await User.create({
            fullName,
            email,
            password: hashedPassword,
            createdById: req.user.id
        });

        if (user) {
            // Assign role through UserRole join table (multi-role pattern)
            await UserRole.create({
                userId: user.id,
                roleId: roleDoc.id
            });

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
        let includeOptions = [
            { model: Role, as: 'roles', through: { attributes: [] }, attributes: ['id', 'name'] },
            { model: User, as: 'advisor', attributes: ['id', 'fullName'] }
        ];

        let users;
        if (role) {
            const roleDoc = await Role.findOne({ where: { name: role } });
            if (!roleDoc) {
                return res.json([]); // Role not found, return empty
            }
            // Filter users who have this role through UserRole join table
            users = await User.findAll({
                include: [
                    { 
                        model: Role, 
                        as: 'roles', 
                        through: { attributes: [] }, 
                        attributes: ['id', 'name'],
                        where: { id: roleDoc.id }
                    },
                    { model: User, as: 'advisor', attributes: ['id', 'fullName'] }
                ],
                attributes: ['id', 'fullName', 'email']
            });
        } else {
            users = await User.findAll({
                include: includeOptions,
                attributes: ['id', 'fullName', 'email']
            });
        }

        // Transform response to include role for backward compatibility
        const transformedUsers = users.map(user => {
            const userData = user.toJSON();
            // Set primary role as first role for backward compatibility
            userData.role = userData.roles && userData.roles.length > 0 ? userData.roles[0] : null;
            return userData;
        });

        res.json(transformedUsers);
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
        const { Instructor, Department } = require('../models');

        // Find instructor and TA role IDs
        const instructorRole = await Role.findOne({ where: { name: 'instructor' } });
        const taRole = await Role.findOne({ where: { name: 'ta' } });

        if (!instructorRole && !taRole) {
            return res.json([]);
        }

        const roleIds = [];
        if (instructorRole) roleIds.push(instructorRole.id);
        if (taRole) roleIds.push(taRole.id);

        // Use UserRole join table to find users with instructor or TA roles
        const faculty = await User.findAll({
            include: [
                { 
                    model: Role, 
                    as: 'roles', 
                    through: { attributes: [] },
                    attributes: ['id', 'name'],
                    where: { id: { [Op.in]: roleIds } }
                },
                {
                    model: Instructor,
                    as: 'instructorProfile',
                    attributes: ['id', 'title', 'officeLocation', 'officeHours', 'awards'],
                    include: [
                        { model: Department, as: 'department', attributes: ['id', 'name'] }
                    ]
                }
            ],
            attributes: ['id', 'fullName', 'email']
        });

        // Transform to include 'role' for backward compatibility
        const transformedFaculty = faculty.map(user => {
            const userData = user.toJSON();
            userData.role = userData.roles && userData.roles.length > 0 ? userData.roles[0] : null;
            return userData;
        });

        res.json(transformedFaculty);
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
                { model: Role, as: 'roles', through: { attributes: [] }, attributes: ['id', 'name'] }
            ],
            attributes: ['id', 'fullName', 'email', 'profileEavEnabled']
        });

        if (!user) {
            return res.status(404).json({ message: 'User not found' });
        }

        // Transform to include 'role' for backward compatibility
        const userData = user.toJSON();
        userData.role = userData.roles && userData.roles.length > 0 ? userData.roles[0] : null;

        res.json(userData);
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Server error' });
    }
};

// ============================================================================
// Profile EAV Endpoints
// ============================================================================

// @desc    Get user's extended profile attributes
// @route   GET /api/users/:id/profile
const getUserProfile = async (req, res) => {
    try {
        const { id } = req.params;
        const { category } = req.query; // Optional: filter by category

        // Verify user exists
        const user = await User.findByPk(id);
        if (!user) {
            return res.status(404).json({ message: 'User not found' });
        }

        let result;
        if (category) {
            result = await UserProfileEavService.getUserProfileByCategory(id, category);
        } else {
            result = await UserProfileEavService.getUserProfile(id);
        }

        if (!result.success) {
            return res.status(400).json({ message: result.error });
        }

        res.json({
            userId: id,
            profileEavEnabled: user.profileEavEnabled,
            category: category || 'all',
            attributes: result.data,
        });
    } catch (error) {
        console.error('Error getting user profile:', error);
        res.status(500).json({ message: 'Server error' });
    }
};

// @desc    Update user's extended profile attributes (bulk update)
// @route   PUT /api/users/:id/profile
const updateUserProfile = async (req, res) => {
    try {
        const { id } = req.params;
        const attributes = req.body;

        // Verify user exists
        const user = await User.findByPk(id);
        if (!user) {
            return res.status(404).json({ message: 'User not found' });
        }

        // Validate request body
        if (!attributes || typeof attributes !== 'object' || Object.keys(attributes).length === 0) {
            return res.status(400).json({ message: 'Please provide attributes to update' });
        }

        const result = await UserProfileEavService.bulkSetUserProfile(id, attributes);

        if (!result.success) {
            return res.status(400).json({ message: result.error });
        }

        // Enable EAV flag if not already enabled
        if (!user.profileEavEnabled) {
            await UserProfileEavService.enableProfileEav(id);
        }

        res.json({
            message: 'Profile updated successfully',
            userId: id,
            processedCount: result.processedCount,
            results: result.results,
        });
    } catch (error) {
        console.error('Error updating user profile:', error);
        res.status(500).json({ message: 'Server error' });
    }
};

// @desc    Set a single profile attribute
// @route   PUT /api/users/:id/profile/:attributeName
const setProfileAttribute = async (req, res) => {
    try {
        const { id, attributeName } = req.params;
        const { value } = req.body;

        // Verify user exists
        const user = await User.findByPk(id);
        if (!user) {
            return res.status(404).json({ message: 'User not found' });
        }

        if (value === undefined) {
            return res.status(400).json({ message: 'Please provide a value' });
        }

        const result = await UserProfileEavService.setUserProfileAttribute(id, attributeName, value);

        if (!result.success) {
            return res.status(400).json({ message: result.error });
        }

        // Enable EAV flag if not already enabled
        if (!user.profileEavEnabled) {
            await UserProfileEavService.enableProfileEav(id);
        }

        res.json({
            message: 'Attribute set successfully',
            userId: id,
            attributeName,
            value: result.data.value,
        });
    } catch (error) {
        console.error('Error setting profile attribute:', error);
        res.status(500).json({ message: 'Server error' });
    }
};

// @desc    Delete a profile attribute
// @route   DELETE /api/users/:id/profile/:attributeName
const deleteProfileAttribute = async (req, res) => {
    try {
        const { id, attributeName } = req.params;

        // Verify user exists
        const user = await User.findByPk(id);
        if (!user) {
            return res.status(404).json({ message: 'User not found' });
        }

        const result = await UserProfileEavService.deleteUserProfileAttribute(id, attributeName);

        if (!result.success) {
            return res.status(400).json({ message: result.error });
        }

        res.json({
            message: 'Attribute deleted successfully',
            userId: id,
            attributeName,
        });
    } catch (error) {
        console.error('Error deleting profile attribute:', error);
        res.status(500).json({ message: 'Server error' });
    }
};

// @desc    Get available profile attribute definitions
// @route   GET /api/users/profile/attributes
const getAvailableProfileAttributes = async (req, res) => {
    try {
        const { category } = req.query; // Optional category filter

        const result = await UserProfileEavService.getAvailableProfileAttributes(category);

        if (!result.success) {
            return res.status(400).json({ message: result.error });
        }

        res.json({
            category: category || 'all',
            attributes: result.data,
            count: result.data.length,
        });
    } catch (error) {
        console.error('Error getting profile attributes:', error);
        res.status(500).json({ message: 'Server error' });
    }
};

// @desc    Enable/disable profile EAV for a user
// @route   PUT /api/users/:id/profile/eav-status
const setProfileEavStatus = async (req, res) => {
    try {
        const { id } = req.params;
        const { enabled } = req.body;

        // Verify user exists
        const user = await User.findByPk(id);
        if (!user) {
            return res.status(404).json({ message: 'User not found' });
        }

        if (typeof enabled !== 'boolean') {
            return res.status(400).json({ message: 'Please provide enabled (boolean)' });
        }

        let result;
        if (enabled) {
            result = await UserProfileEavService.enableProfileEav(id);
        } else {
            result = await UserProfileEavService.disableProfileEav(id);
        }

        if (!result.success) {
            return res.status(400).json({ message: result.error });
        }

        res.json({
            message: `Profile EAV ${enabled ? 'enabled' : 'disabled'} successfully`,
            userId: id,
            profileEavEnabled: enabled,
        });
    } catch (error) {
        console.error('Error setting profile EAV status:', error);
        res.status(500).json({ message: 'Server error' });
    }
};

// @desc    Initialize profile for user based on role
// @route   POST /api/users/:id/profile/initialize
const initializeUserProfile = async (req, res) => {
    try {
        const { id } = req.params;
        const { role } = req.body; // e.g., 'student', 'instructor', 'parent', 'staff'

        // Verify user exists
        const user = await User.findByPk(id, {
            include: [{ model: Role, as: 'role', attributes: ['name'] }]
        });
        
        if (!user) {
            return res.status(404).json({ message: 'User not found' });
        }

        // Use provided role or infer from user's actual role
        const profileRole = role || (user.role ? user.role.name : null);
        
        if (!profileRole) {
            return res.status(400).json({ message: 'Please provide a role to initialize profile for' });
        }

        const result = await UserProfileEavService.initializeProfileForRole(id, profileRole);

        if (!result.success) {
            return res.status(400).json({ message: result.error });
        }

        // Enable EAV flag
        await UserProfileEavService.enableProfileEav(id);

        res.json({
            message: `Profile initialized for ${profileRole} role`,
            userId: id,
            role: profileRole,
            attributes: result.data,
        });
    } catch (error) {
        console.error('Error initializing user profile:', error);
        res.status(500).json({ message: 'Server error' });
    }
};

module.exports = {
    getAllUsers,
    assignAdvisor,
    createUser,
    getFacultyMembers,
    getUserById,
    // Profile EAV endpoints
    getUserProfile,
    updateUserProfile,
    setProfileAttribute,
    deleteProfileAttribute,
    getAvailableProfileAttributes,
    setProfileEavStatus,
    initializeUserProfile,
};
