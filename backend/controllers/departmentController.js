const { Department } = require('../models');

// @desc    Create a new department
// @route   POST /api/departments
const createDepartment = async (req, res) => {
  try {
    const { code, name } = req.body;

    // Validate required fields
    if (!code || !name) {
      return res.status(400).json({ message: 'Code and name are required' });
    }

    // Check for duplicate code
    const existingDepartment = await Department.findOne({ where: { code } });
    if (existingDepartment) {
      return res.status(400).json({ message: 'Department code already exists' });
    }

    const department = await Department.create({ code, name });
    res.status(201).json(department);
  } catch (error) {
    console.error(error);
    if (error.name === 'SequelizeValidationError') {
      return res.status(400).json({ message: error.errors[0].message });
    }
    res.status(500).json({ message: 'Server error' });
  }
};

// @desc    Get all departments
// @route   GET /api/departments
const getAllDepartments = async (req, res) => {
  try {
    const departments = await Department.findAll({
      order: [['name', 'ASC']],
    });
    res.json(departments);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server error' });
  }
};

// @desc    Get single department by ID
// @route   GET /api/departments/:id
const getDepartmentById = async (req, res) => {
  try {
    const department = await Department.findByPk(req.params.id);
    if (!department) {
      return res.status(404).json({ message: 'Department not found' });
    }
    res.json(department);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server error' });
  }
};

// @desc    Update department
// @route   PUT /api/departments/:id
const updateDepartment = async (req, res) => {
  try {
    const department = await Department.findByPk(req.params.id);
    if (!department) {
      return res.status(404).json({ message: 'Department not found' });
    }

    const { code, name } = req.body;

    // Check for duplicate code if changing
    if (code && code !== department.code) {
      const existingDepartment = await Department.findOne({ where: { code } });
      if (existingDepartment) {
        return res.status(400).json({ message: 'Department code already exists' });
      }
    }

    await department.update({ code: code || department.code, name: name || department.name });
    res.json(department);
  } catch (error) {
    console.error(error);
    if (error.name === 'SequelizeValidationError') {
      return res.status(400).json({ message: error.errors[0].message });
    }
    res.status(500).json({ message: 'Server error' });
  }
};

// @desc    Delete department
// @route   DELETE /api/departments/:id
const deleteDepartment = async (req, res) => {
  try {
    const department = await Department.findByPk(req.params.id);
    if (!department) {
      return res.status(404).json({ message: 'Department not found' });
    }

    await department.destroy();
    res.json({ message: 'Department deleted successfully' });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server error' });
  }
};

module.exports = {
  createDepartment,
  getAllDepartments,
  getDepartmentById,
  updateDepartment,
  deleteDepartment,
};
