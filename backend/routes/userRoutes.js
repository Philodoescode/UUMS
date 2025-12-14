const express = require('express');
const router = express.Router();
const { getAllUsers, assignAdvisor } = require('../controllers/userController');
const { protect, authorize } = require('../middleware/authMiddleware');

router.use(protect);

router.get('/', authorize('admin', 'advisor'), getAllUsers);
router.put('/:id/advisor', authorize('admin'), assignAdvisor);

module.exports = router;
