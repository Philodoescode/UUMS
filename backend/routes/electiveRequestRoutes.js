const express = require('express');
const router = express.Router();
const {
    createRequest,
    getRequests,
    updateRequest
} = require('../controllers/electiveRequestController');
const { protect } = require('../middleware/authMiddleware');

router.use(protect);

router.post('/', createRequest);
router.get('/', getRequests);
router.put('/:id', updateRequest);

module.exports = router;
