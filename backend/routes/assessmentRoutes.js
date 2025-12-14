const express = require('express');
const router = express.Router();
const {
    createAssessment,
    getAssessmentsByCourse,
    startAssessment,
    submitAssessment,
    getSubmission
} = require('../controllers/assessmentController');
const { protect } = require('../middleware/authMiddleware');

// All routes are protected
router.use(protect);

router.post('/', createAssessment);
router.get('/course/:courseId', getAssessmentsByCourse);
router.post('/:id/start', startAssessment);
router.post('/:id/submit', submitAssessment);
router.get('/submission/:id', getSubmission);

module.exports = router;
