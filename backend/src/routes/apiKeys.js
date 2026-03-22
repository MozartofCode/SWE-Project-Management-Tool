const express = require('express');
const { body, param } = require('express-validator');

const apiKeysController = require('../controllers/apiKeysController');
const { authenticate } = require('../middleware/auth');
const validate = require('../middleware/validate');

const router = express.Router();

// All routes require authentication
router.use(authenticate);

// GET /api/v1/auth/api-keys
router.get('/', apiKeysController.list);

// POST /api/v1/auth/api-keys
router.post(
  '/',
  [
    body('name')
      .trim()
      .notEmpty().withMessage('Key name is required')
      .isLength({ max: 100 }).withMessage('Name must be 100 characters or fewer'),
  ],
  validate,
  apiKeysController.create
);

// DELETE /api/v1/auth/api-keys/:id
router.delete(
  '/:id',
  [param('id').isUUID().withMessage('Invalid key ID')],
  validate,
  apiKeysController.revoke
);

module.exports = router;
