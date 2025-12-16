const { Facility } = require('../models');
const { Op } = require('sequelize');

// @desc    Create a new facility
// @route   POST /api/facilities
const createFacility = async (req, res) => {
  try {
    const { name, code, type, capacity, status, description, floor, building, equipmentList } = req.body;

    // Validate required fields
    if (!name || !code || !type || capacity === undefined) {
      return res.status(400).json({
        message: 'name, code, type, and capacity are required',
      });
    }

    // Normalize code to uppercase
    const normalizedCode = code.toUpperCase();

    // Check for duplicate code (case-insensitive)
    const existingFacility = await Facility.findOne({
      where: {
        code: normalizedCode,
      },
    });

    if (existingFacility) {
      return res.status(400).json({
        message: `Facility code '${normalizedCode}' already exists`,
      });
    }

    // Create facility
    const facility = await Facility.create({
      name,
      code: normalizedCode,
      type,
      capacity,
      status: status || 'Active',
      description,
      floor,
      building,
      equipmentList,
    });

    res.status(201).json(facility);
  } catch (error) {
    console.error('Error creating facility:', error);
    if (error.name === 'SequelizeValidationError') {
      return res.status(400).json({ message: error.errors[0].message });
    }
    res.status(500).json({ message: 'Server error' });
  }
};

// @desc    Get all facilities with pagination and filtering
// @route   GET /api/facilities
const getAllFacilities = async (req, res) => {
  try {
    const {
      page = 1,
      limit = 20,
      type,
      status,
      minCapacity,
      maxCapacity,
      building,
      search,
    } = req.query;

    // Parse pagination
    const pageNum = Math.max(1, parseInt(page));
    const limitNum = Math.min(100, Math.max(1, parseInt(limit)));
    const offset = (pageNum - 1) * limitNum;

    // Build filter conditions
    const where = { isActive: true };

    if (type) where.type = type;
    if (status) where.status = status;
    if (building) where.building = building;

    // Capacity range filter
    if (minCapacity || maxCapacity) {
      where.capacity = {};
      if (minCapacity) where.capacity[Op.gte] = parseInt(minCapacity);
      if (maxCapacity) where.capacity[Op.lte] = parseInt(maxCapacity);
    }

    // Search filter (name or code)
    if (search) {
      where[Op.or] = [
        { name: { [Op.iLike]: `%${search}%` } },
        { code: { [Op.iLike]: `%${search}%` } },
      ];
    }

    // Fetch facilities with pagination
    const { count, rows: facilities } = await Facility.findAndCountAll({
      where,
      limit: limitNum,
      offset,
      order: [['code', 'ASC']],
    });

    // Calculate total pages
    const totalPages = Math.ceil(count / limitNum);

    res.json({
      facilities,
      pagination: {
        total: count,
        page: pageNum,
        limit: limitNum,
        totalPages,
      },
    });
  } catch (error) {
    console.error('Error fetching facilities:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

// @desc    Get single facility by ID
// @route   GET /api/facilities/:id
const getFacilityById = async (req, res) => {
  try {
    const facility = await Facility.findByPk(req.params.id);

    if (!facility || !facility.isActive) {
      return res.status(404).json({ message: 'Facility not found' });
    }

    res.json(facility);
  } catch (error) {
    console.error('Error fetching facility:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

// @desc    Update facility
// @route   PUT /api/facilities/:id
const updateFacility = async (req, res) => {
  try {
    const facility = await Facility.findByPk(req.params.id);

    if (!facility || !facility.isActive) {
      return res.status(404).json({ message: 'Facility not found' });
    }

    const { name, code, type, capacity, status, description, floor, building, equipmentList } = req.body;

    // Check for duplicate code if changing
    if (code && code.toUpperCase() !== facility.code) {
      const normalizedCode = code.toUpperCase();
      const existingFacility = await Facility.findOne({
        where: { code: normalizedCode },
      });

      if (existingFacility) {
        return res.status(400).json({
          message: `Facility code '${normalizedCode}' already exists`,
        });
      }
    }

    // Update facility
    await facility.update({
      name: name !== undefined ? name : facility.name,
      code: code !== undefined ? code.toUpperCase() : facility.code,
      type: type !== undefined ? type : facility.type,
      capacity: capacity !== undefined ? capacity : facility.capacity,
      status: status !== undefined ? status : facility.status,
      description: description !== undefined ? description : facility.description,
      floor: floor !== undefined ? floor : facility.floor,
      building: building !== undefined ? building : facility.building,
      equipmentList: equipmentList !== undefined ? equipmentList : facility.equipmentList,
    });

    res.json(facility);
  } catch (error) {
    console.error('Error updating facility:', error);
    if (error.name === 'SequelizeValidationError') {
      return res.status(400).json({ message: error.errors[0].message });
    }
    res.status(500).json({ message: 'Server error' });
  }
};

// @desc    Soft delete facility
// @route   DELETE /api/facilities/:id
const deleteFacility = async (req, res) => {
  try {
    const facility = await Facility.findByPk(req.params.id);

    if (!facility || !facility.isActive) {
      return res.status(404).json({ message: 'Facility not found' });
    }

    // Soft delete
    await facility.update({ isActive: false });

    res.json({ message: 'Facility deleted successfully' });
  } catch (error) {
    console.error('Error deleting facility:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

// @desc    Update facility status
// @route   PATCH /api/facilities/:id/status
const updateFacilityStatus = async (req, res) => {
  try {
    const { status } = req.body;

    if (!status || !['Active', 'Maintenance'].includes(status)) {
      return res.status(400).json({
        message: 'Valid status is required (Active or Maintenance)',
      });
    }

    const facility = await Facility.findByPk(req.params.id);

    if (!facility || !facility.isActive) {
      return res.status(404).json({ message: 'Facility not found' });
    }

    await facility.update({ status });

    res.json(facility);
  } catch (error) {
    console.error('Error updating facility status:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

module.exports = {
  createFacility,
  getAllFacilities,
  getFacilityById,
  updateFacility,
  deleteFacility,
  updateFacilityStatus,
};
