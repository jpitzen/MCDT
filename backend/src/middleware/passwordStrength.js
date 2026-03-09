/**
 * Password Strength Validator
 *
 * Centralised password complexity rules used by registration and change-password
 * routes.  Expressed as an express-validator chain that can be spread into any
 * route's validation array.
 *
 * Rules:
 *  - Minimum 8 characters
 *  - At least one uppercase letter
 *  - At least one lowercase letter
 *  - At least one digit
 *  - At least one special character (!@#$%^&*()_+-=[]{}|;:'",.<>?/`~)
 */

const { body } = require('express-validator');

const PASSWORD_MIN_LENGTH = 8;

/**
 * Returns an express-validator chain for password strength.
 * @param {string} field — the body field to validate (default: 'password')
 */
const passwordStrength = (field = 'password') =>
  body(field)
    .isLength({ min: PASSWORD_MIN_LENGTH })
    .withMessage(`Password must be at least ${PASSWORD_MIN_LENGTH} characters`)
    .matches(/[A-Z]/)
    .withMessage('Password must contain at least one uppercase letter')
    .matches(/[a-z]/)
    .withMessage('Password must contain at least one lowercase letter')
    .matches(/\d/)
    .withMessage('Password must contain at least one digit')
    .matches(/[!@#$%^&*()_+\-=[\]{}|;:'",.<>?/`~]/)
    .withMessage('Password must contain at least one special character');

module.exports = { passwordStrength, PASSWORD_MIN_LENGTH };
