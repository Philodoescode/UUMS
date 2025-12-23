const express = require('express');
const router = express.Router();
const { uploadDocument, getStudentDocuments } = require('../controllers/studentDocumentController');
const { protect, authorize } = require('../middleware/authMiddleware');
const upload = require('../middleware/uploadMiddleware');

// Route path relative to /api/student-documents (if mounted there)
// or check server.js for mounting point

// Upload a document - Admin
router.post('/', protect, authorize('admin'), upload.single('file'), uploadDocument);

// Get documents for a specific student
router.get('/:studentId', protect, authorize('admin', 'advisor'), getStudentDocuments);

// Generate Transcript PDF
const { generateTranscript } = require('../controllers/studentDocumentController');
router.get('/:studentId/transcript', protect, authorize('admin'), generateTranscript);

module.exports = router;
