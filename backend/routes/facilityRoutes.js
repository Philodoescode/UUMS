const express = require('express');
const router = express.Router();
const {
  createFacility,
  getAllFacilities,
  getFacilityById,
  updateFacility,
  deleteFacility,
  updateFacilityStatus,
  getFacilityBookings,
  createBooking,
  // Equipment EAV operations
  getFacilityEquipment,
  addFacilityEquipment,
  updateFacilityEquipment,
  deleteFacilityEquipment,
} = require('../controllers/facilityController');
const { protect, authorize } = require('../middleware/authMiddleware');

// All routes require authentication
router.use(protect);

// GET routes - accessible to all authenticated users
router.get('/bookings', getFacilityBookings);

// GET routes - accessible to all authenticated users
router.get('/', getAllFacilities);
router.get('/:id', getFacilityById);

// Equipment routes (EAV-based)
router.get('/:id/equipment', getFacilityEquipment);
router.post('/:id/equipment', authorize('admin'), addFacilityEquipment);
router.put('/:id/equipment/:equipmentId', authorize('admin'), updateFacilityEquipment);
router.delete('/:id/equipment/:equipmentId', authorize('admin'), deleteFacilityEquipment);

// Modification routes - admin only
router.post('/', authorize('admin'), createFacility);
router.post('/book', authorize('admin'), createBooking);
router.put('/:id', authorize('admin'), updateFacility);
router.delete('/:id', authorize('admin'), deleteFacility);
router.patch('/:id/status', authorize('admin'), updateFacilityStatus);

module.exports = router;
