const express = require('express');
const router = express.Router();
const {
    createAppeal,
    getMyAppeals,
    getAppealByCourse,
    getAllAppeals,
    updateAppeal,
} = require('../controllers/appealController');
const { protect, authorize } = require('../middleware/authMiddleware');

// All routes require authentication
router.use(protect);

// Student routes
router.post('/', authorize('student'), createAppeal);
router.get('/my-appeals', authorize('student'), getMyAppeals);
router.get('/course/:courseId', authorize('student'), getAppealByCourse);

// Admin/Advisor routes
router.get('/', authorize('admin', 'advisor'), getAllAppeals);
router.put('/:id', authorize('admin', 'advisor'), updateAppeal);

module.exports = router;
