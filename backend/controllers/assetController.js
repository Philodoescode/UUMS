const { Asset, AssetAllocationLog, User } = require('../models');

// @desc    Get all assets
// @route   GET /api/assets
const getAllAssets = async (req, res) => {
    try {
        const { status, category } = req.query;
        const where = {};

        if (status) where.status = status;
        if (category) where.category = category;

        const assets = await Asset.findAll({
            where,
            include: [
                { model: User, as: 'currentHolder', attributes: ['id', 'fullName', 'email'] }
            ],
            order: [['createdAt', 'DESC']],
        });

        res.json(assets);
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Server error' });
    }
};

// @desc    Get single asset with allocation history
// @route   GET /api/assets/:id
const getAssetById = async (req, res) => {
    try {
        const { id } = req.params;

        const asset = await Asset.findByPk(id, {
            include: [
                { model: User, as: 'currentHolder', attributes: ['id', 'fullName', 'email'] },
                {
                    model: AssetAllocationLog,
                    as: 'allocationHistory',
                    include: [
                        { model: User, as: 'user', attributes: ['id', 'fullName', 'email'] },
                        { model: User, as: 'performedBy', attributes: ['id', 'fullName', 'email'] }
                    ],
                    order: [['createdAt', 'DESC']],
                }
            ],
        });

        if (!asset) {
            return res.status(404).json({ message: 'Asset not found' });
        }

        res.json(asset);
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Server error' });
    }
};

// @desc    Create new asset
// @route   POST /api/assets
const createAsset = async (req, res) => {
    try {
        const { name, assetTag, category, location, description } = req.body;

        // Check for duplicate asset tag
        const existingAsset = await Asset.findOne({ where: { assetTag } });
        if (existingAsset) {
            return res.status(400).json({ message: 'Asset tag already exists' });
        }

        const asset = await Asset.create({
            name,
            assetTag,
            category: category || 'other',
            location,
            description,
            status: 'available',
        });

        res.status(201).json(asset);
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Server error' });
    }
};

// @desc    Update asset details
// @route   PUT /api/assets/:id
const updateAsset = async (req, res) => {
    try {
        const { id } = req.params;
        const { name, assetTag, category, location, description, status } = req.body;

        const asset = await Asset.findByPk(id);
        if (!asset) {
            return res.status(404).json({ message: 'Asset not found' });
        }

        // Check if new asset tag conflicts with another asset
        if (assetTag && assetTag !== asset.assetTag) {
            const existingAsset = await Asset.findOne({ where: { assetTag } });
            if (existingAsset) {
                return res.status(400).json({ message: 'Asset tag already exists' });
            }
        }

        await asset.update({
            name: name || asset.name,
            assetTag: assetTag || asset.assetTag,
            category: category || asset.category,
            location: location !== undefined ? location : asset.location,
            description: description !== undefined ? description : asset.description,
            status: status || asset.status,
        });

        res.json(asset);
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Server error' });
    }
};

// @desc    Checkout asset to user
// @route   POST /api/assets/:id/checkout
const checkoutAsset = async (req, res) => {
    try {
        const { id } = req.params;
        const { userId, notes } = req.body;

        const asset = await Asset.findByPk(id);
        if (!asset) {
            return res.status(404).json({ message: 'Asset not found' });
        }

        if (asset.status === 'checked_out') {
            return res.status(400).json({ message: 'Asset is already checked out' });
        }

        if (asset.status === 'retired') {
            return res.status(400).json({ message: 'Cannot checkout a retired asset' });
        }

        // Verify user exists
        const user = await User.findByPk(userId);
        if (!user) {
            return res.status(404).json({ message: 'User not found' });
        }

        // Update asset
        await asset.update({
            status: 'checked_out',
            currentHolderId: userId,
        });

        // Create allocation log entry
        await AssetAllocationLog.create({
            assetId: id,
            userId: userId,
            action: 'checked_out',
            performedById: req.user.id,
            notes,
        });

        // Reload with associations
        await asset.reload({
            include: [{ model: User, as: 'currentHolder', attributes: ['id', 'fullName', 'email'] }]
        });

        res.json({ message: 'Asset checked out successfully', asset });
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Server error' });
    }
};

// @desc    Return asset
// @route   POST /api/assets/:id/return
const returnAsset = async (req, res) => {
    try {
        const { id } = req.params;
        const { notes } = req.body;

        const asset = await Asset.findByPk(id);
        if (!asset) {
            return res.status(404).json({ message: 'Asset not found' });
        }

        if (asset.status !== 'checked_out') {
            return res.status(400).json({ message: 'Asset is not currently checked out' });
        }

        const previousHolderId = asset.currentHolderId;

        // Update asset
        await asset.update({
            status: 'available',
            currentHolderId: null,
        });

        // Create allocation log entry
        await AssetAllocationLog.create({
            assetId: id,
            userId: previousHolderId,
            action: 'returned',
            performedById: req.user.id,
            notes,
        });

        res.json({ message: 'Asset returned successfully', asset });
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Server error' });
    }
};

// @desc    Delete asset
// @route   DELETE /api/assets/:id
const deleteAsset = async (req, res) => {
    try {
        const { id } = req.params;

        const asset = await Asset.findByPk(id);
        if (!asset) {
            return res.status(404).json({ message: 'Asset not found' });
        }

        if (asset.status === 'checked_out') {
            return res.status(400).json({ message: 'Cannot delete an asset that is currently checked out' });
        }

        await asset.destroy();
        res.json({ message: 'Asset deleted successfully' });
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Server error' });
    }
};

module.exports = {
    getAllAssets,
    getAssetById,
    createAsset,
    updateAsset,
    checkoutAsset,
    returnAsset,
    deleteAsset,
};
