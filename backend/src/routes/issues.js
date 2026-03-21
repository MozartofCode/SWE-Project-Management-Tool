const express = require('express');
const { body, param, query } = require('express-validator');

const issuesController = require('../controllers/issuesController');
const validate = require('../middleware/validate');

// mergeParams: true gives access to :id from parent projects router
const router = express.Router({ mergeParams: true });

router.get(
  '/',
  [
    query('status')
      .optional()
      .isIn(['open', 'in_progress', 'closed'])
      .withMessage('Status must be open, in_progress, or closed'),
    query('priority')
      .optional()
      .isIn(['low', 'medium', 'high', 'critical'])
      .withMessage('Priority must be low, medium, high, or critical'),
    query('assignee_id')
      .optional()
      .isUUID()
      .withMessage('Assignee ID must be a valid UUID'),
    query('sort')
      .optional()
      .isIn(['created_at', 'updated_at', 'due_date', 'priority', 'status'])
      .withMessage('Invalid sort field'),
    query('order')
      .optional()
      .isIn(['asc', 'desc'])
      .withMessage('Order must be asc or desc'),
  ],
  validate,
  issuesController.listIssues
);

router.post(
  '/',
  [
    body('title')
      .trim()
      .notEmpty()
      .withMessage('Title is required')
      .isLength({ max: 255 })
      .withMessage('Title must be 255 characters or fewer'),
    body('description').optional().trim(),
    body('status')
      .optional()
      .isIn(['open', 'in_progress', 'closed'])
      .withMessage('Status must be open, in_progress, or closed'),
    body('priority')
      .optional()
      .isIn(['low', 'medium', 'high', 'critical'])
      .withMessage('Priority must be low, medium, high, or critical'),
    body('assignee_id')
      .optional({ nullable: true })
      .isUUID()
      .withMessage('Assignee ID must be a valid UUID'),
    body('due_date')
      .optional({ nullable: true })
      .isISO8601()
      .withMessage('Due date must be a valid ISO 8601 date'),
  ],
  validate,
  issuesController.createIssue
);

router.get(
  '/:issueId',
  [param('issueId').isUUID().withMessage('Valid issue ID required')],
  validate,
  issuesController.getIssueById
);

router.put(
  '/:issueId',
  [
    param('issueId').isUUID().withMessage('Valid issue ID required'),
    body('title')
      .optional()
      .trim()
      .notEmpty()
      .withMessage('Title cannot be empty')
      .isLength({ max: 255 })
      .withMessage('Title must be 255 characters or fewer'),
    body('description').optional().trim(),
    body('status')
      .optional()
      .isIn(['open', 'in_progress', 'closed'])
      .withMessage('Status must be open, in_progress, or closed'),
    body('priority')
      .optional()
      .isIn(['low', 'medium', 'high', 'critical'])
      .withMessage('Priority must be low, medium, high, or critical'),
    body('assignee_id')
      .optional({ nullable: true })
      .isUUID()
      .withMessage('Assignee ID must be a valid UUID'),
    body('due_date')
      .optional({ nullable: true })
      .isISO8601()
      .withMessage('Due date must be a valid ISO 8601 date'),
  ],
  validate,
  issuesController.updateIssue
);

router.delete(
  '/:issueId',
  [param('issueId').isUUID().withMessage('Valid issue ID required')],
  validate,
  issuesController.deleteIssue
);

module.exports = router;
