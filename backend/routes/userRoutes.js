const express = require('express');
const router = express.Router();
const { getAllUsers, assignAdvisor, createUser, getFacultyMembers, getUserById } = require('../controllers/userController');
const { protect, authorize } = require('../middleware/authMiddleware');

router.use(protect);

// Faculty endpoint - accessible by any authenticated user
router.get('/faculty', getFacultyMembers);

router.post('/', authorize('admin'), createUser);
router.get('/', authorize('admin', 'advisor', 'hr', 'student', 'instructor', 'ta'), getAllUsers);

// Get user by ID - accessible by any authenticated user (for messaging)
router.get('/:id', getUserById);

router.put('/:id/advisor', authorize('admin'), assignAdvisor);

module.exports = router;

