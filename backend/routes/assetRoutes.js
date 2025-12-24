const express = require('express');
const router = express.Router();
const {
    getAllAssets,
    getAssetById,
    createAsset,
    updateAsset,
    checkoutAsset,
    returnAsset,
    deleteAsset,
    getStudentAssets,
} = require('../controllers/assetController');
const { protect, authorize } = require('../middleware/authMiddleware');

router.use(protect);

// Student/Instructor route (View their own assets)
router.get('/my-assets', authorize('admin', 'student', 'instructor'), getStudentAssets);

// Admin Routes
router.use(authorize('admin'));

// CRUD routes
router.get('/', getAllAssets);
router.get('/:id', getAssetById);
router.post('/', createAsset);
router.put('/:id', updateAsset);
router.delete('/:id', deleteAsset);

// Checkout/Return routes
router.post('/:id/checkout', checkoutAsset);
router.post('/:id/return', returnAsset);

module.exports = router;
