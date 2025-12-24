const express = require('express');
const router = express.Router();
const { createRecord, getRecordsByUser, deleteRecord } = require('../controllers/professionalDevelopmentController');
const { protect, authorize } = require('../middleware/authMiddleware');

router.route('/')
    .post(protect, authorize('hr', 'admin'), createRecord);

router.route('/user/:userId')
    .get(protect, getRecordsByUser);

router.route('/:id')
    .delete(protect, authorize('hr', 'admin'), deleteRecord);

module.exports = router;
