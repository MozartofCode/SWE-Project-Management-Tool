const express = require('express');
const { body, param } = require('express-validator');

const usersController = require('../controllers/usersController');
const { authenticate, adminOnly } = require('../middleware/auth');
const validate = require('../middleware/validate');

const router = express.Router();

// All user routes require auth
router.use(authenticate);

router.get('/', adminOnly, usersController.listUsers);

router.get(
  '/:id',
  [param('id').isUUID().withMessage('Valid user ID required')],
  validate,
  usersController.getUserById
);

router.put(
  '/:id',
  [
    param('id').isUUID().withMessage('Valid user ID required'),
    body('full_name')
      .optional()
      .trim()
      .notEmpty()
      .withMessage('Full name cannot be empty')
      .isLength({ max: 100 })
      .withMessage('Full name must be 100 characters or fewer'),
    body('avatar_url')
      .optional()
      .isURL()
      .withMessage('Avatar URL must be a valid URL'),
  ],
  validate,
  usersController.updateUser
);

// Anthropic API key (stored per-user, never returned to frontend)
router.get('/me/anthropic-key', usersController.getAnthropicKeyStatus);
router.put(
  '/me/anthropic-key',
  [body('key').optional({ nullable: true }).isString()],
  validate,
  usersController.saveAnthropicKey
);

module.exports = router;
