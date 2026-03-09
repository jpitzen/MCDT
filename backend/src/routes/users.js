const express = require('express');
const { body, validationResult } = require('express-validator');
const { User } = require('../models');
const { authenticate, authorize } = require('../middleware/auth');
const { asyncHandler, sendSuccess, sendError } = require('../middleware/errorHandler');
const bcrypt = require('bcrypt');

const router = express.Router();

// All user routes require authentication
router.use(authenticate);

/**
 * GET /api/users
 * List all users (admin and operator can view)
 */
router.get(
  '/',
  authorize(['admin', 'operator']),
  asyncHandler(async (req, res) => {
    const users = await User.findAll({
      attributes: [
        'id',
        'firstName',
        'lastName',
        'email',
        'role',
        'isActive',
        'lastLogin',
        'createdAt',
        'updatedAt'
      ],
      order: [['createdAt', 'DESC']]
    });

    sendSuccess(res, { users });
  })
);

/**
 * GET /api/users/:id
 * Get specific user details (admin only)
 */
router.get(
  '/:id',
  authorize(['admin']),
  asyncHandler(async (req, res) => {
    const user = await User.findByPk(req.params.id, {
      attributes: [
        'id',
        'firstName',
        'lastName',
        'email',
        'role',
        'isActive',
        'lastLogin',
        'createdAt',
        'updatedAt'
      ]
    });

    if (!user) {
      return sendError(res, 'User not found', 404, 'USER_NOT_FOUND');
    }

    sendSuccess(res, { user });
  })
);

/**
 * PUT /api/users/:id
 * Update user details (admin only)
 */
router.put(
  '/:id',
  authorize(['admin']),
  [
    body('firstName').optional().trim().isLength({ min: 1, max: 100 }),
    body('lastName').optional().trim().isLength({ min: 1, max: 100 }),
    body('email').optional().trim().isEmail(),
    body('password').optional().trim().isLength({ min: 8 }),
    body('role').optional().isIn(['admin', 'operator', 'viewer', 'approver']),
    body('isActive').optional().isBoolean()
  ],
  asyncHandler(async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return sendError(res, 'Validation failed', 400, 'VALIDATION_ERROR', errors.array());
    }

    const user = await User.findByPk(req.params.id);
    if (!user) {
      return sendError(res, 'User not found', 404, 'USER_NOT_FOUND');
    }

    const { firstName, lastName, email, password, role, isActive } = req.body;

    // Update allowed fields
    if (firstName !== undefined) user.firstName = firstName;
    if (lastName !== undefined) user.lastName = lastName;
    if (email !== undefined) user.email = email;
    if (role !== undefined) user.role = role;
    if (isActive !== undefined) user.isActive = isActive;

    // Hash password if provided
    if (password) {
      user.passwordHash = await bcrypt.hash(password, 10);
    }

    await user.save();

    sendSuccess(res, {
      user: {
        id: user.id,
        firstName: user.firstName,
        lastName: user.lastName,
        email: user.email,
        role: user.role,
        isActive: user.isActive,
        lastLogin: user.lastLogin,
        updatedAt: user.updatedAt
      }
    }, 200, 'User updated successfully');
  })
);

/**
 * DELETE /api/users/:id
 * Delete user (soft delete - admin only)
 */
router.delete(
  '/:id',
  authorize(['admin']),
  asyncHandler(async (req, res) => {
    const user = await User.findByPk(req.params.id);
    if (!user) {
      return sendError(res, 'User not found', 404, 'USER_NOT_FOUND');
    }

    // Prevent deleting self
    if (user.id === req.user.id) {
      return sendError(res, 'Cannot delete your own account', 400, 'CANNOT_DELETE_SELF');
    }

    // Soft delete - set isActive to false
    user.isActive = false;
    await user.save();

    sendSuccess(res, null, 200, 'User deleted successfully');
  })
);

module.exports = router;
