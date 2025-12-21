const { User, Role, Instructor, Compensation, LeaveRequest, CompensationAuditLog, Department } = require('../models');
const { Op } = require('sequelize');

// @desc    Get all Instructors and TAs (for HR Employees page)
// @route   GET /api/hr/employees
// @access  Private (HR only)
const getAllEmployees = async (req, res) => {
    try {
        // Fetch all users with role 'instructor' or 'ta'
        const employees = await User.findAll({
            include: [
                {
                    model: Role,
                    as: 'role',
                    where: {
                        name: {
                            [Op.in]: ['instructor', 'ta']
                        }
                    },
                    attributes: ['id', 'name']
                },
                {
                    model: Instructor,
                    as: 'instructorProfile',
                    required: false,
                    include: [
                        {
                            model: Department,
                            as: 'department',
                            attributes: ['id', 'name', 'code']
                        }
                    ]
                },
                {
                    model: Compensation,
                    as: 'compensation',
                    required: false
                },
                {
                    model: LeaveRequest,
                    as: 'leaveRequests',
                    required: false,
                    where: {
                        status: 'pending'
                    },
                    attributes: ['id', 'status']
                }
            ],
            attributes: ['id', 'fullName', 'email', 'isActive', 'createdAt']
        });

        // Calculate net pay for each employee
        const employeesWithNetPay = employees.map(employee => {
            const emp = employee.toJSON();

            if (emp.compensation) {
                const totalAllowances =
                    parseFloat(emp.compensation.housingAllowance || 0) +
                    parseFloat(emp.compensation.transportAllowance || 0) +
                    parseFloat(emp.compensation.bonuses || 0);

                const totalDeductions =
                    parseFloat(emp.compensation.taxDeduction || 0) +
                    parseFloat(emp.compensation.insuranceDeduction || 0) +
                    parseFloat(emp.compensation.unpaidLeaveDeduction || 0) +
                    parseFloat(emp.compensation.otherDeductions || 0);

                emp.netPay = parseFloat(emp.compensation.baseSalary || 0) + totalAllowances - totalDeductions;
            } else {
                emp.netPay = 0;
            }

            // Add pending leave requests count
            emp.pendingLeaveCount = emp.leaveRequests ? emp.leaveRequests.length : 0;

            return emp;
        });

        res.status(200).json({
            success: true,
            count: employeesWithNetPay.length,
            data: employeesWithNetPay
        });
    } catch (error) {
        console.error('Error fetching employees:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to fetch employees',
            error: error.message
        });
    }
};

// @desc    Get single employee details with compensation
// @route   GET /api/hr/employees/:id
// @access  Private (HR only)
const getEmployeeById = async (req, res) => {
    try {
        const { id } = req.params;

        const employee = await User.findOne({
            where: { id },
            include: [
                {
                    model: Role,
                    as: 'role',
                    attributes: ['id', 'name']
                },
                {
                    model: Instructor,
                    as: 'instructorProfile',
                    required: false,
                    include: [
                        {
                            model: Department,
                            as: 'department',
                            attributes: ['id', 'name', 'code']
                        }
                    ]
                },
                {
                    model: Compensation,
                    as: 'compensation',
                    required: false
                }
            ],
            attributes: ['id', 'fullName', 'email', 'isActive', 'createdAt']
        });

        if (!employee) {
            return res.status(404).json({
                success: false,
                message: 'Employee not found'
            });
        }

        // Calculate net pay
        const emp = employee.toJSON();
        if (emp.compensation) {
            const totalAllowances =
                parseFloat(emp.compensation.housingAllowance || 0) +
                parseFloat(emp.compensation.transportAllowance || 0) +
                parseFloat(emp.compensation.bonuses || 0);

            const totalDeductions =
                parseFloat(emp.compensation.taxDeduction || 0) +
                parseFloat(emp.compensation.insuranceDeduction || 0) +
                parseFloat(emp.compensation.unpaidLeaveDeduction || 0) +
                parseFloat(emp.compensation.otherDeductions || 0);

            emp.netPay = parseFloat(emp.compensation.baseSalary || 0) + totalAllowances - totalDeductions;
        } else {
            emp.netPay = 0;
        }

        res.status(200).json({
            success: true,
            data: emp
        });
    } catch (error) {
        console.error('Error fetching employee:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to fetch employee',
            error: error.message
        });
    }
};

// @desc    Update employee compensation
// @route   PUT /api/hr/employees/:id/compensation
// @access  Private (HR only)
const updateCompensation = async (req, res) => {
    try {
        const { id } = req.params;
        const {
            baseSalary,
            housingAllowance,
            transportAllowance,
            bonuses,
            taxDeduction,
            insuranceDeduction,
            unpaidLeaveDeduction,
            otherDeductions,
            changeReason
        } = req.body;

        // Verify employee exists
        const employee = await User.findByPk(id);
        if (!employee) {
            return res.status(404).json({
                success: false,
                message: 'Employee not found'
            });
        }

        // Find or create compensation record
        let [compensation, created] = await Compensation.findOrCreate({
            where: { userId: id },
            defaults: {
                userId: id,
                baseSalary: baseSalary || 0,
                housingAllowance: housingAllowance || 0,
                transportAllowance: transportAllowance || 0,
                bonuses: bonuses || 0,
                taxDeduction: taxDeduction || 0,
                insuranceDeduction: insuranceDeduction || 0,
                unpaidLeaveDeduction: unpaidLeaveDeduction || 0,
                otherDeductions: otherDeductions || 0,
            }
        });

        if (!created) {
            // Log changes for audit
            const fields = {
                baseSalary,
                housingAllowance,
                transportAllowance,
                bonuses,
                taxDeduction,
                insuranceDeduction,
                unpaidLeaveDeduction,
                otherDeductions
            };

            for (const [field, newValue] of Object.entries(fields)) {
                if (newValue !== undefined && compensation[field] != newValue) {
                    await CompensationAuditLog.create({
                        compensationId: compensation.id,
                        userId: id,
                        changedById: req.user.id,
                        fieldChanged: field,
                        oldValue: compensation[field]?.toString() || '0',
                        newValue: newValue?.toString() || '0',
                        changeReason: changeReason || 'Updated by HR'
                    });
                }
            }

            // Update compensation
            await compensation.update({
                baseSalary: baseSalary !== undefined ? baseSalary : compensation.baseSalary,
                housingAllowance: housingAllowance !== undefined ? housingAllowance : compensation.housingAllowance,
                transportAllowance: transportAllowance !== undefined ? transportAllowance : compensation.transportAllowance,
                bonuses: bonuses !== undefined ? bonuses : compensation.bonuses,
                taxDeduction: taxDeduction !== undefined ? taxDeduction : compensation.taxDeduction,
                insuranceDeduction: insuranceDeduction !== undefined ? insuranceDeduction : compensation.insuranceDeduction,
                unpaidLeaveDeduction: unpaidLeaveDeduction !== undefined ? unpaidLeaveDeduction : compensation.unpaidLeaveDeduction,
                otherDeductions: otherDeductions !== undefined ? otherDeductions : compensation.otherDeductions,
            });
        } else {
            // Log initial creation
            await CompensationAuditLog.create({
                compensationId: compensation.id,
                userId: id,
                changedById: req.user.id,
                fieldChanged: 'initial_creation',
                oldValue: null,
                newValue: 'Compensation record created',
                changeReason: changeReason || 'Initial compensation setup by HR'
            });
        }

        // Reload to get updated values
        await compensation.reload();

        res.status(200).json({
            success: true,
            message: created ? 'Compensation created successfully' : 'Compensation updated successfully',
            data: compensation
        });
    } catch (error) {
        console.error('Error updating compensation:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to update compensation',
            error: error.message
        });
    }
};

// @desc    Get compensation audit logs for an employee
// @route   GET /api/hr/employees/:id/compensation/audit
// @access  Private (HR only)
const getCompensationAuditLogs = async (req, res) => {
    try {
        const { id } = req.params;

        const compensation = await Compensation.findOne({
            where: { userId: id }
        });

        if (!compensation) {
            return res.status(404).json({
                success: false,
                message: 'No compensation record found for this employee'
            });
        }

        const auditLogs = await CompensationAuditLog.findAll({
            where: { compensationId: compensation.id },
            include: [
                {
                    model: User,
                    as: 'changedBy',
                    attributes: ['id', 'fullName', 'email']
                }
            ],
            order: [['createdAt', 'DESC']]
        });

        res.status(200).json({
            success: true,
            count: auditLogs.length,
            data: auditLogs
        });
    } catch (error) {
        console.error('Error fetching audit logs:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to fetch audit logs',
            error: error.message
        });
    }
};

// @desc    Get all leave requests (with optional filter by status)
// @route   GET /api/hr/leave-requests
// @access  Private (HR only)
const getLeaveRequests = async (req, res) => {
    try {
        const { status } = req.query;

        const whereClause = {};
        if (status) {
            whereClause.status = status;
        }

        const leaveRequests = await LeaveRequest.findAll({
            where: whereClause,
            include: [
                {
                    model: User,
                    as: 'user',
                    attributes: ['id', 'fullName', 'email'],
                    include: [
                        {
                            model: Role,
                            as: 'role',
                            attributes: ['name']
                        }
                    ]
                },
                {
                    model: User,
                    as: 'reviewedBy',
                    required: false,
                    attributes: ['id', 'fullName', 'email']
                }
            ],
            order: [['createdAt', 'DESC']]
        });

        res.status(200).json({
            success: true,
            count: leaveRequests.length,
            data: leaveRequests
        });
    } catch (error) {
        console.error('Error fetching leave requests:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to fetch leave requests',
            error: error.message
        });
    }
};

// @desc    Get leave requests for a specific employee
// @route   GET /api/hr/employees/:id/leave-requests
// @access  Private (HR only)
const getEmployeeLeaveRequests = async (req, res) => {
    try {
        const { id } = req.params;

        const leaveRequests = await LeaveRequest.findAll({
            where: { userId: id },
            include: [
                {
                    model: User,
                    as: 'reviewedBy',
                    required: false,
                    attributes: ['id', 'fullName', 'email']
                }
            ],
            order: [['createdAt', 'DESC']]
        });

        res.status(200).json({
            success: true,
            count: leaveRequests.length,
            data: leaveRequests
        });
    } catch (error) {
        console.error('Error fetching employee leave requests:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to fetch leave requests',
            error: error.message
        });
    }
};

// @desc    Review leave request (approve or deny)
// @route   PUT /api/hr/leave-requests/:id
// @access  Private (HR only)
const reviewLeaveRequest = async (req, res) => {
    try {
        const { id } = req.params;
        const { status, reviewNotes } = req.body;

        if (!['approved', 'denied'].includes(status)) {
            return res.status(400).json({
                success: false,
                message: 'Status must be either "approved" or "denied"'
            });
        }

        const leaveRequest = await LeaveRequest.findByPk(id, {
            include: [
                {
                    model: User,
                    as: 'user',
                    attributes: ['id', 'fullName', 'email']
                }
            ]
        });

        if (!leaveRequest) {
            return res.status(404).json({
                success: false,
                message: 'Leave request not found'
            });
        }

        if (leaveRequest.status !== 'pending') {
            return res.status(400).json({
                success: false,
                message: 'This leave request has already been reviewed'
            });
        }

        await leaveRequest.update({
            status,
            reviewedById: req.user.id,
            reviewedAt: new Date(),
            reviewNotes: reviewNotes || null
        });

        // TODO: Send notification to employee (implement notification system)
        // For now, we'll just log it
        console.log(`Leave request ${status} for ${leaveRequest.user.fullName} (${leaveRequest.user.email})`);

        await leaveRequest.reload({
            include: [
                {
                    model: User,
                    as: 'user',
                    attributes: ['id', 'fullName', 'email']
                },
                {
                    model: User,
                    as: 'reviewedBy',
                    attributes: ['id', 'fullName', 'email']
                }
            ]
        });

        res.status(200).json({
            success: true,
            message: `Leave request ${status} successfully`,
            data: leaveRequest
        });
    } catch (error) {
        console.error('Error reviewing leave request:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to review leave request',
            error: error.message
        });
    }
};

module.exports = {
    getAllEmployees,
    getEmployeeById,
    updateCompensation,
    getCompensationAuditLogs,
    getLeaveRequests,
    getEmployeeLeaveRequests,
    reviewLeaveRequest
};
