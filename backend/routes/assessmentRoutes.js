const express = require('express');
const router = express.Router();
const {
    createAssessment,
    getAssessmentsByCourse,
    startAssessment,
    submitAssessment,
    getSubmission,
    // Metadata EAV operations
    getAssessmentMetadata,
    getAssessmentMetadataDetails,
    setAssessmentMetadata,
    deleteAssessmentMetadata,
    getAvailableMetadataAttributes,
} = require('../controllers/assessmentController');
const { protect } = require('../middleware/authMiddleware');

// All routes are protected
router.use(protect);

// Metadata attribute definitions (available to all authenticated users)
router.get('/metadata/attributes', getAvailableMetadataAttributes);

router.post('/', createAssessment);
router.get('/course/:courseId', getAssessmentsByCourse);
router.post('/:id/start', startAssessment);
router.post('/:id/submit', submitAssessment);
router.get('/submission/:id', getSubmission);

// Assessment metadata routes (EAV-based extensible metadata)
router.get('/:id/metadata', getAssessmentMetadata);
router.get('/:id/metadata/details', getAssessmentMetadataDetails);
router.put('/:id/metadata', setAssessmentMetadata);
router.delete('/:id/metadata/:attributeName', deleteAssessmentMetadata);

module.exports = router;
