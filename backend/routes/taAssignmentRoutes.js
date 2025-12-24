const express = require('express');
const router = express.Router();
const {
    getTAsForCourse,
    assignTA,
    updateTADuties,
    removeTA,
    getTAMyCourses,
    getAvailableTAs,
} = require('../controllers/taAssignmentController');
const { protect, authorize } = require('../middleware/authMiddleware');

// All routes require authentication
router.use(protect);

// Routes for instructors to manage TAs
router.get('/course/:courseId', authorize('instructor'), getTAsForCourse);
router.post('/', authorize('instructor'), assignTA);
router.put('/:id', authorize('instructor'), updateTADuties);
router.delete('/:id', authorize('instructor'), removeTA);
router.get('/available-tas', authorize('instructor'), getAvailableTAs);

// Route for TAs to see their assigned courses
router.get('/my-courses', authorize('ta'), getTAMyCourses);

module.exports = router;
