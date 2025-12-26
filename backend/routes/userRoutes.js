const express = require('express');
const router = express.Router();
const { 
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
} = require('../controllers/userController');
const { protect, authorize } = require('../middleware/authMiddleware');

router.use(protect);

// Faculty endpoint - accessible by any authenticated user
router.get('/faculty', getFacultyMembers);

// ============================================================================
// Profile Attribute Definitions (must be before /:id routes)
// ============================================================================

// Get available profile attribute definitions
// GET /api/users/profile/attributes?category=student
router.get('/profile/attributes', getAvailableProfileAttributes);

// ============================================================================
// User CRUD
// ============================================================================

router.post('/', authorize('admin'), createUser);
router.get('/', authorize('admin', 'advisor', 'hr', 'student', 'instructor', 'ta'), getAllUsers);

// Get user by ID - accessible by any authenticated user (for messaging)
router.get('/:id', getUserById);

router.put('/:id/advisor', authorize('admin'), assignAdvisor);

// ============================================================================
// User Profile EAV Routes
// ============================================================================

// Get user's extended profile
// GET /api/users/:id/profile?category=student
router.get('/:id/profile', getUserProfile);

// Bulk update profile attributes
// PUT /api/users/:id/profile { "student_major": "CS", "common_pronouns": "they/them" }
router.put('/:id/profile', updateUserProfile);

// Enable/disable profile EAV for user
// PUT /api/users/:id/profile/eav-status { "enabled": true }
router.put('/:id/profile/eav-status', setProfileEavStatus);

// Initialize profile for a role (creates common + role-specific attributes)
// POST /api/users/:id/profile/initialize { "role": "student" }
router.post('/:id/profile/initialize', initializeUserProfile);

// Set single profile attribute
// PUT /api/users/:id/profile/:attributeName { "value": "Computer Science" }
router.put('/:id/profile/:attributeName', setProfileAttribute);

// Delete single profile attribute
// DELETE /api/users/:id/profile/:attributeName
router.delete('/:id/profile/:attributeName', deleteProfileAttribute);

module.exports = router;

