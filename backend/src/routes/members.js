const express = require('express');
const { body, param } = require('express-validator');

const membersController = require('../controllers/membersController');
const validate = require('../middleware/validate');

// mergeParams: true gives access to :id from parent projects router
const router = express.Router({ mergeParams: true });

router.get('/', membersController.listMembers);

router.post(
  '/',
  [
    body('user_id').isUUID().withMessage('Valid user ID required'),
    body('role')
      .optional()
      .isIn(['manager', 'developer', 'viewer'])
      .withMessage('Role must be manager, developer, or viewer'),
  ],
  validate,
  membersController.addMember
);

router.delete(
  '/:userId',
  [param('userId').isUUID().withMessage('Valid user ID required')],
  validate,
  membersController.removeMember
);

module.exports = router;
