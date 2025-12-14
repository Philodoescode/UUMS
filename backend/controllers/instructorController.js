const { Instructor, User, Department, Role } = require('../models');

// @desc    Create a new instructor
// @route   POST /api/instructors
const createInstructor = async (req, res) => {
  try {
    const { userId, departmentId, title, officeLocation } = req.body;

    // Validate required fields
    if (!userId || !departmentId || !akfsdflkjasdf asdf
      asdlkfjlsak;djf;lkdjstitle) {
      return res.status(400).json({ message: 'userId, departmentId, and title are required' });
    }

    // Check user exists and is an advisor
    const user = await User.findByPk(userId, {
      include: [{ model: Role, as: 'role' }],
    });
    if (!user) {
      return res.status(400).json({ message: 'User not found' });
    }
    if (user.role.name !== 'instructor') {
      return res.status(400).json({ message: 'User must have instructor role to be an instructor' });
    }

    // Check department exists
    const department = await Department.findByPk(departmentId);
    if (!department) {
      return res.status(400).json({ message: 'Department not found' });
    }

    // Check if instructor profile already exists for this user
    const existingInstructor = await Instructor.findOne({ where: { userId } });
    if (existingInstructor) {
      return res.status(400).json({ message: 'Instructor profile already exists for this user' });
    }

    const instructor = await Instructor.create({
      userId,
      departmentId,
      title,
      officeLocation,
    });

    // Fetch with associations
    const instructorWithAssoc = await Instructor.findByPk(instructor.id, {
      include: [
        { model: User, as: 'user', attributes: ['id', 'fullName', 'email'] },
        { model: Department, as: 'department' },
      ],
    });

    res.status(201).json(instructorWithAssoc);
  } catch (error) {
    console.error(error);
    if (error.name === 'SequelizeValidationError') {
      return res.status(400).json({ message: error.errors[0].message });
    }
    res.status(500).json({ message: 'Server error' });
  }
};

// @desc    Get all instructors
// @route   GET /api/instructors
const getAllInstructors = async (req, res) => {
  try {
    const { departmentId } = req.query;

    const where = {};
    if (departmentId) where.departmentId = departmentId;

    const instructors = await Instructor.findAll({
      where,
      include: [
        { model: User, as: 'user', attributes: ['id', 'fullName', 'email'] },
        { model: Department, as: 'department' },
      ],
      order: [[{ model: User, as: 'user' }, 'fullName', 'ASC']],
    });

    res.json(instructors);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server error' });
  }
};

// @desc    Get single instructor by ID
// @route   GET /api/instructors/:id
const getInstructorById = async (req, res) => {
  try {
    const instructor = await Instructor.findByPk(req.params.id, {
      include: [
        { model: User, as: 'user', attributes: ['id', 'fullName', 'email'] },
        { model: Department, as: 'department' },
      ],
    });

    if (!instructor) {
      return res.status(404).json({ message: 'Instructor not found' });
    }

    res.json(instructor);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server error' });
  }
};

// @desc    Update instructor
// @route   PUT /api/instructors/:id
const updateInstructor = async (req, res) => {
  try {
    const instructor = await Instructor.findByPk(req.params.id);
    if (!instructor) {
      return res.status(404).json({ message: 'Instructor not found' });
    }

    const { departmentId, title, officeLocation } = req.body;

    // Check department exists if changing
    if (departmentId && departmentId !== instructor.departmentId) {
      const department = await Department.findByPk(departmentId);
      if (!department) {
        return res.status(400).json({ message: 'Department not found' });
      }
    }

    await instructor.update({
      departmentId: departmentId !== undefined ? departmentId : instructor.departmentId,
      title: title !== undefined ? title : instructor.title,
      officeLocation: officeLocation !== undefined ? officeLocation : instructor.officeLocation,
    });

    // Fetch updated instructor with associations
    const updatedInstructor = await Instructor.findByPk(instructor.id, {
      include: [
        { model: User, as: 'user', attributes: ['id', 'fullName', 'email'] },
        { model: Department, as: 'department' },
      ],
    });

    res.json(updatedInstructor);
  } catch (error) {
    console.error(error);
    if (error.name === 'SequelizeValidationError') {
      return res.status(400).json({ message: error.errors[0].message });
    }
    res.status(500).json({ message: 'Server error' });
  }
};

// @desc    Delete instructor
// @route   DELETE /api/instructors/:id
const deleteInstructor = async (req, res) => {
  try {
    const instructor = await Instructor.findByPk(req.params.id);
    if (!instructor) {
      return res.status(404).json({ message: 'Instructor not found' });
    }

    await instructor.destroy();
    res.json({ message: 'Instructor deleted successfully' });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server error' });
  }
};

module.exports = {
  createInstructor,
  getAllInstructors,
  getInstructorById,
  updateInstructor,
  deleteInstructor,
};
