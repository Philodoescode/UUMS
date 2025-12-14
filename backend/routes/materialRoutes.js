const express = require('express');
const router = express.Router();
const { uploadMaterial, getMaterialsByCourse } = require('../controllers/materialController');
const { protect, authorize } = require('../middleware/authMiddleware');

router.post('/', protect, authorize('instructor', 'admin'), uploadMaterial);
router.get('/course/:courseId', protect, getMaterialsByCourse);

module.exports = router;
