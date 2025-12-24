const { Asset, AssetAllocationLog, User, Department } = require('../models');

// @desc    Get all assets
// @route   GET /api/assets
const getAllAssets = async (req, res) => {
    try {
        const { status, type } = req.query;
        const where = {};

        if (status) where.status = status;
        if (type) where.type = type;

        const assets = await Asset.findAll({
            where,
            include: [
                { model: User, as: 'currentHolder', attributes: ['id', 'fullName', 'email'] },
                { model: Department, as: 'assignedDepartment', attributes: ['id', 'name', 'code'] }
            ],
            order: [['createdAt', 'DESC']],
        });

        res.json(assets);
    } catch (error) {
        console.error("GET ASSET ERROR:", error);
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
                { model: Department, as: 'assignedDepartment', attributes: ['id', 'name', 'code'] },
                {
                    model: AssetAllocationLog,
                    as: 'allocationHistory',
                    include: [
                        { model: User, as: 'user', attributes: ['id', 'fullName', 'email'] },
                        { model: Department, as: 'department', attributes: ['id', 'name', 'code'] },
                        { model: User, as: 'performedBy', attributes: ['id', 'fullName', 'email'] }
                    ],
                }
            ],
            order: [
                [{ model: AssetAllocationLog, as: 'allocationHistory' }, 'createdAt', 'DESC']
            ],
        });

        if (!asset) {
            return res.status(404).json({ message: 'Asset not found' });
        }

        res.json(asset);
    } catch (error) {
        console.error("GET ASSET ERROR:", error);
        res.status(500).json({ message: 'Server error' });
    }
};

// @desc    Create new asset
// @route   POST /api/assets
const createAsset = async (req, res) => {
    try {
        const { assetName, serialNumber, type, purchaseDate, value, location, description, status } = req.body;

        // Check for duplicate serial number
        const existingAsset = await Asset.findOne({ where: { serialNumber } });
        if (existingAsset) {
            return res.status(400).json({ message: 'Serial Number / License Key already exists' });
        }

        const asset = await Asset.create({
            assetName,
            serialNumber,
            type: type || 'Hardware',
            purchaseDate,
            value,
            location,
            description,
            status: status || 'Available',
        });

        res.status(201).json(asset);
    } catch (error) {
        console.error("GET ASSET ERROR:", error);
        res.status(500).json({ message: 'Server error' });
    }
};

// @desc    Update asset details
// @route   PUT /api/assets/:id
const updateAsset = async (req, res) => {
    try {
        const { id } = req.params;
        const { assetName, serialNumber, type, purchaseDate, value, location, description, status } = req.body;

        const asset = await Asset.findByPk(id);
        if (!asset) {
            return res.status(404).json({ message: 'Asset not found' });
        }

        // Check if new serial number conflicts with another asset
        if (serialNumber && serialNumber !== asset.serialNumber) {
            const existingAsset = await Asset.findOne({ where: { serialNumber } });
            if (existingAsset) {
                return res.status(400).json({ message: 'Serial Number / License Key already exists' });
            }
        }

        await asset.update({
            assetName: assetName || asset.assetName,
            serialNumber: serialNumber || asset.serialNumber,
            type: type || asset.type,
            purchaseDate: purchaseDate || asset.purchaseDate,
            value: value || asset.value,
            location: location !== undefined ? location : asset.location,
            description: description !== undefined ? description : asset.description,
            status: status || asset.status,
        });

        res.json(asset);
    } catch (error) {
        console.error("GET ASSET ERROR:", error);
        res.status(500).json({ message: 'Server error' });
    }
};

// @desc    Checkout asset to user
// @route   POST /api/assets/:id/checkout
const checkoutAsset = async (req, res) => {
    try {
        const { id } = req.params;
        const { userId, departmentId, notes } = req.body;

        const asset = await Asset.findByPk(id);
        if (!asset) {
            return res.status(404).json({ message: 'Asset not found' });
        }

        if (asset.status === 'In Use') {
            return res.status(400).json({ message: 'Asset is already checked out' });
        }

        if (asset.status === 'Retired') {
            return res.status(400).json({ message: 'Cannot checkout a retired asset' });
        }

        if (!userId && !departmentId) {
            return res.status(400).json({ message: 'Must provide either userId or departmentId' });
        }

        let updateData = { status: 'In Use' };
        let logData = {
            assetId: id,
            action: 'checked_out',
            performedById: req.user.id,
            notes,
        };

        if (userId) {
            const user = await User.findByPk(userId);
            if (!user) return res.status(404).json({ message: 'User not found' });
            updateData.currentHolderId = userId;
            updateData.assignedToDepartmentId = null; // Clear dept if assigning to user
            logData.userId = userId;
        } else if (departmentId) {
            const dept = await Department.findByPk(departmentId);
            if (!dept) return res.status(404).json({ message: 'Department not found' });
            updateData.assignedToDepartmentId = departmentId;
            updateData.currentHolderId = null; // Clear user if assigning to dept
            logData.departmentId = departmentId;
        }

        // Update asset
        await asset.update(updateData);

        // Create log
        await AssetAllocationLog.create(logData);

        // Reload with associations
        await asset.reload({
            include: [
                { model: User, as: 'currentHolder', attributes: ['id', 'fullName', 'email'] },
                { model: Department, as: 'assignedDepartment', attributes: ['id', 'name', 'code'] }
            ]
        });

        res.json({ message: 'Asset checked out successfully', asset });
    } catch (error) {
        console.error("GET ASSET ERROR:", error);
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

        if (asset.status !== 'In Use') { // Updated status check
            return res.status(400).json({ message: 'Asset is not currently checked out' });
        }

        const previousHolderId = asset.currentHolderId;
        const previousDepartmentId = asset.assignedToDepartmentId;

        // Update asset
        await asset.update({
            status: 'Available',
            currentHolderId: null,
            assignedToDepartmentId: null,
        });

        // Create allocation log entry
        await AssetAllocationLog.create({
            assetId: id,
            userId: previousHolderId,
            departmentId: previousDepartmentId,
            action: 'returned',
            performedById: req.user.id,
            notes,
        });

        res.json({ message: 'Asset returned successfully', asset });
    } catch (error) {
        console.error("GET ASSET ERROR:", error);
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

        if (asset.status === 'In Use') { // Updated status check
            return res.status(400).json({ message: 'Cannot delete an asset that is currently checked out' });
        }

        await asset.destroy();
        res.json({ message: 'Asset deleted successfully' });
    } catch (error) {
        console.error("GET ASSET ERROR:", error);
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
