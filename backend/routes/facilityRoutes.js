const express = require('express');
const router = express.Router();
const {
  createFacility,
  getAllFacilities,
  getFacilityById,
  updateFacility,
  deleteFacility,
  updateFacilityStatus,
} = require('../controllers/facilityController');
const { protect, authorize } = require('../middleware/authMiddleware');

// All routes require authentication
router.use(protect);

// GET routes - accessible to all authenticated users
router.get('/', getAllFacilities);
router.get('/:id', getFacilityById);

// Modification routes - admin only
router.post('/', authorize('admin'), createFacility);
router.put('/:id', authorize('admin'), updateFacility);
router.delete('/:id', authorize('admin'), deleteFacility);
router.patch('/:id/status', authorize('admin'), updateFacilityStatus);

module.exports = router;
