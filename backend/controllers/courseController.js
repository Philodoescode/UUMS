const { Course, Department, Instructor, User, CourseInstructor } = require('../models');

// @desc    Create a new course
// @route   POST /api/courses
const createCourse = async (req, res) => {
  try {
    const { courseCode, name, description, credits, departmentId, semester, year, capacity, courseType, prerequisiteIds } = req.body;

    // Validate required fields
    if (!courseCode || !name || credits === undefined || !departmentId || !semester || !year || !capacity) {
      return res.status(400).json({
        message: 'courseCode, name, credits, departmentId, semester, year, and capacity are required'
      });
    }

    // Check department exists
    const department = await Department.findByPk(departmentId);
    if (!department) {
      return res.status(400).json({ message: 'Department not found' });
    }

    // Check for duplicate course code
    const existingCourse = await Course.findOne({ where: { courseCode } });
    if (existingCourse) {
      return res.status(400).json({ message: 'Course code already exists' });
    }

    const course = await Course.create({
      courseCode,
      name,
      description,
      credits,
      departmentId,
      semester,
      year,
      capacity,
      courseType: courseType || 'Core',
    });

    // Set prerequisites if provided
    if (prerequisiteIds && Array.isArray(prerequisiteIds) && prerequisiteIds.length > 0) {
      // Filter out the course's own ID to prevent self-referencing
      const validPrereqIds = prerequisiteIds.filter(id => id !== course.id);
      await course.setPrerequisites(validPrereqIds);
    }

    // Fetch with department and prerequisites associations
    const courseWithAssociations = await Course.findByPk(course.id, {
      include: [
        { model: Department, as: 'department' },
        { model: Course, as: 'prerequisites', attributes: ['id', 'courseCode', 'name'] },
      ],
    });

    res.status(201).json(courseWithAssociations);
  } catch (error) {
    console.error(error);
    if (error.name === 'SequelizeValidationError') {
      return res.status(400).json({ message: error.errors[0].message });
    }
    res.status(500).json({ message: 'Server error' });
  }
};

// @desc    Get all courses
// @route   GET /api/courses
const getAllCourses = async (req, res) => {
  try {
    const { departmentId, semester, year, isActive, courseType } = req.query;

    // Build filter conditions
    const where = {};
    if (departmentId) where.departmentId = departmentId;
    if (semester) where.semester = semester;
    if (year) where.year = parseInt(year);
    if (isActive !== undefined) where.isActive = isActive === 'true';
    if (courseType) where.courseType = courseType;

    const courses = await Course.findAll({
      where,
      include: [
        { model: Department, as: 'department' },
        { model: Course, as: 'prerequisites', attributes: ['id', 'courseCode', 'name'] },
      ],
      order: [['courseCode', 'ASC']],
    });

    res.json(courses);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server error' });
  }
};

// @desc    Get single course by ID
// @route   GET /api/courses/:id
const getCourseById = async (req, res) => {
  try {
    const course = await Course.findByPk(req.params.id, {
      include: [
        { model: Department, as: 'department' },
        { model: Course, as: 'prerequisites', attributes: ['id', 'courseCode', 'name'] },
      ],
    });

    if (!course) {
      return res.status(404).json({ message: 'Course not found' });
    }

    res.json(course);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server error' });
  }
};

// @desc    Update course
// @route   PUT /api/courses/:id
const updateCourse = async (req, res) => {
  try {
    const course = await Course.findByPk(req.params.id);
    if (!course) {
      return res.status(404).json({ message: 'Course not found' });
    }

    const { courseCode, name, description, credits, departmentId, semester, year, capacity, isActive, courseType, prerequisiteIds } = req.body;

    // Check for duplicate course code if changing
    if (courseCode && courseCode !== course.courseCode) {
      const existingCourse = await Course.findOne({ where: { courseCode } });
      if (existingCourse) {
        return res.status(400).json({ message: 'Course code already exists' });
      }
    }

    // Check department exists if changing
    if (departmentId && departmentId !== course.departmentId) {
      const department = await Department.findByPk(departmentId);
      if (!department) {
        return res.status(400).json({ message: 'Department not found' });
      }
    }

    await course.update({
      courseCode: courseCode !== undefined ? courseCode : course.courseCode,
      name: name !== undefined ? name : course.name,
      description: description !== undefined ? description : course.description,
      credits: credits !== undefined ? credits : course.credits,
      departmentId: departmentId !== undefined ? departmentId : course.departmentId,
      semester: semester !== undefined ? semester : course.semester,
      year: year !== undefined ? year : course.year,
      capacity: capacity !== undefined ? capacity : course.capacity,
      isActive: isActive !== undefined ? isActive : course.isActive,
      courseType: courseType !== undefined ? courseType : course.courseType,
    });

    // Update prerequisites if provided
    if (prerequisiteIds !== undefined) {
      // Filter out the course's own ID to prevent self-referencing
      const validPrereqIds = Array.isArray(prerequisiteIds)
        ? prerequisiteIds.filter(id => id !== course.id)
        : [];
      await course.setPrerequisites(validPrereqIds);
    }

    // Fetch updated course with associations
    const updatedCourse = await Course.findByPk(course.id, {
      include: [
        { model: Department, as: 'department' },
        { model: Course, as: 'prerequisites', attributes: ['id', 'courseCode', 'name'] },
      ],
    });

    res.json(updatedCourse);
  } catch (error) {
    console.error(error);
    if (error.name === 'SequelizeValidationError') {
      return res.status(400).json({ message: error.errors[0].message });
    }
    res.status(500).json({ message: 'Server error' });
  }
};

// @desc    Soft delete course (set isActive to false)
// @route   DELETE /api/courses/:id
const deleteCourse = async (req, res) => {
  try {
    const course = await Course.findByPk(req.params.id);
    if (!course) {
      return res.status(404).json({ message: 'Course not found' });
    }

    // Soft delete - set isActive to false
    await course.update({ isActive: false });
    res.json({ message: 'Course deactivated successfully' });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server error' });
  }
};

// @desc    Get instructors assigned to a course
// @route   GET /api/courses/:id/instructors
const getCourseInstructors = async (req, res) => {
  try {
    const course = await Course.findByPk(req.params.id, {
      include: [
        {
          model: Instructor,
          as: 'instructors',
          include: [
            { model: User, as: 'user', attributes: ['id', 'fullName', 'email'] },
            { model: Department, as: 'department' },
          ],
        },
      ],
    });

    if (!course) {
      return res.status(404).json({ message: 'Course not found' });
    }

    res.json(course.instructors || []);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server error' });
  }
};

// @desc    Assign instructor to a course
// @route   POST /api/courses/:id/instructors
const assignInstructor = async (req, res) => {
  try {
    const { instructorId, isPrimary } = req.body;
    const courseId = req.params.id;

    if (!instructorId) {
      return res.status(400).json({ message: 'instructorId is required' });
    }

    const course = await Course.findByPk(courseId);
    if (!course) {
      return res.status(404).json({ message: 'Course not found' });
    }

    const instructor = await Instructor.findByPk(instructorId, {
      include: [{ model: User, as: 'user', attributes: ['id', 'fullName', 'email'] }],
    });
    if (!instructor) {
      return res.status(404).json({ message: 'Instructor not found' });
    }

    // Check if already assigned
    const existing = await CourseInstructor.findOne({
      where: { courseId, instructorId },
    });

    if (existing) {
      // Update isPrimary if changing
      if (isPrimary !== undefined && existing.isPrimary !== isPrimary) {
        await existing.update({ isPrimary });
        return res.json({
          message: 'Instructor assignment updated',
          isPrimary,
        });
      }
      return res.status(400).json({ message: 'Instructor already assigned to this course' });
    }

    // Create assignment
    await CourseInstructor.create({
      courseId,
      instructorId,
      isPrimary: isPrimary || false,
    });

    res.status(201).json({
      message: 'Instructor assigned successfully',
      instructor: {
        id: instructor.id,
        name: instructor.user.fullName,
        email: instructor.user.email,
        isPrimary: isPrimary || false,
      },
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server error' });
  }
};

// @desc    Remove instructor from a course
// @route   DELETE /api/courses/:courseId/instructors/:instructorId
const removeInstructor = async (req, res) => {
  try {
    const { id: courseId, instructorId } = req.params;

    const assignment = await CourseInstructor.findOne({
      where: { courseId, instructorId },
    });

    if (!assignment) {
      return res.status(404).json({ message: 'Instructor not assigned to this course' });
    }

    await assignment.destroy();
    res.json({ message: 'Instructor removed from course successfully' });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server error' });
  }
};

module.exports = {
  createCourse,
  getAllCourses,
  getCourseById,
  updateCourse,
  deleteCourse,
  getCourseInstructors,
  assignInstructor,
  removeInstructor,
};
