const express = require('express');
const router = express.Router();
const { protect, authorize } = require('../middleware/authMiddleware');
const { getChildren, getChildProgress } = require('../controllers/parentController');

// All routes are protected and for parents only
router.use(protect);
router.use(authorize('parent')); // Assuming 'parent' role name is 'parent'

router.get('/children', getChildren);
router.get('/children/:childId/progress', getChildProgress);

module.exports = router;
