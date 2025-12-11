const express = require('express');
const router = express.Router();
const {
    getInstructorCourses,
    getCourseStudents,
    assignGrade,
    getCourseAuditLog,
} = require('../controllers/instructorPortalController');
const { protect, authorize } = require('../middleware/authMiddleware');

// All routes require authentication and instructor role
router.use(protect);
router.use(authorize('instructor'));

// Get courses the instructor teaches
router.get('/my-courses', getInstructorCourses);

// Get students in a specific course
router.get('/courses/:courseId/students', getCourseStudents);

// Assign or update grade for a student
router.put('/enrollments/:enrollmentId/grade', assignGrade);

// Get audit log for a course
router.get('/courses/:courseId/audit-log', getCourseAuditLog);

module.exports = router;
