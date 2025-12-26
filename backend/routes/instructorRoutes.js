const express = require('express');
const router = express.Router();
const {
  createInstructor,
  getAllInstructors,
  getInstructorById,
  updateInstructor,
  deleteInstructor,
  // Awards EAV endpoints
  getInstructorAwards,
  addInstructorAward,
  updateInstructorAward,
  deleteInstructorAward,
  getInstructorAwardsLegacy,
} = require('../controllers/instructorController');
const { protect, authorize } = require('../middleware/authMiddleware');

// All routes require authentication
router.use(protect);

// GET routes - accessible to all authenticated users
router.get('/', getAllInstructors);
router.get('/:id', getInstructorById);

// ============================================================================
// INSTRUCTOR AWARDS ROUTES (EAV-based)
// Awards data is now stored in EAV tables with legacy JSONB fallback
// ============================================================================
router.get('/:id/awards', getInstructorAwards);
router.get('/:id/awards/legacy', getInstructorAwardsLegacy); // Deprecated - for backward compatibility
router.post('/:id/awards', authorize('admin', 'instructor'), addInstructorAward);
router.put('/:id/awards/:awardGroupId', authorize('admin', 'instructor'), updateInstructorAward);
router.delete('/:id/awards/:awardGroupId', authorize('admin', 'instructor'), deleteInstructorAward);

// Modification routes - admin only
router.post('/', authorize('admin'), createInstructor);
router.put('/:id', authorize('admin'), updateInstructor);
router.delete('/:id', authorize('admin'), deleteInstructor);

module.exports = router;
