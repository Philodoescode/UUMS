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
} = require('../controllers/assetController');
const { protect, authorize } = require('../middleware/authMiddleware');

// All routes require authentication and admin role
router.use(protect);
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
