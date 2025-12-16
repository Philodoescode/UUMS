const express = require('express');
const router = express.Router();
const { createApplication } = require('../controllers/applicationController');

// Public route - No protect middleware
router.post('/', createApplication);

module.exports = router;
