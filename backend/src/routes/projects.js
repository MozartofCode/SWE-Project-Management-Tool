const express = require('express');
const { body, param } = require('express-validator');

const projectsController = require('../controllers/projectsController');
const { authenticate } = require('../middleware/auth');
const validate = require('../middleware/validate');
const memberRoutes = require('./members');
const issueRoutes = require('./issues');
const { nestedRouter: activityNestedRouter } = require('./activity');

const router = express.Router();

// All project routes require auth
router.use(authenticate);

// Nested resource routers
router.use('/:id/members', memberRoutes);
router.use('/:id/issues', issueRoutes);
router.use('/:id/activity', activityNestedRouter);

router.get('/', projectsController.listProjects);

router.post(
  '/',
  [
    body('name')
      .trim()
      .notEmpty()
      .withMessage('Project name is required')
      .isLength({ max: 200 })
      .withMessage('Name must be 200 characters or fewer'),
    body('description').optional().trim(),
    body('status')
      .optional()
      .isIn(['active', 'on_hold', 'completed', 'archived'])
      .withMessage('Status must be active, on_hold, completed, or archived'),
    body('start_date')
      .optional({ nullable: true })
      .isISO8601()
      .withMessage('Start date must be a valid ISO 8601 date'),
    body('end_date')
      .optional({ nullable: true })
      .isISO8601()
      .withMessage('End date must be a valid ISO 8601 date'),
  ],
  validate,
  projectsController.createProject
);

router.get(
  '/:id',
  [param('id').isUUID().withMessage('Valid project ID required')],
  validate,
  projectsController.getProjectById
);

router.put(
  '/:id',
  [
    param('id').isUUID().withMessage('Valid project ID required'),
    body('name')
      .optional()
      .trim()
      .notEmpty()
      .withMessage('Name cannot be empty')
      .isLength({ max: 200 })
      .withMessage('Name must be 200 characters or fewer'),
    body('description').optional().trim(),
    body('status')
      .optional()
      .isIn(['active', 'on_hold', 'completed', 'archived'])
      .withMessage('Status must be active, on_hold, completed, or archived'),
    body('start_date')
      .optional({ nullable: true })
      .isISO8601()
      .withMessage('Start date must be a valid ISO 8601 date'),
    body('end_date')
      .optional({ nullable: true })
      .isISO8601()
      .withMessage('End date must be a valid ISO 8601 date'),
  ],
  validate,
  projectsController.updateProject
);

router.delete(
  '/:id',
  [param('id').isUUID().withMessage('Valid project ID required')],
  validate,
  projectsController.deleteProject
);

module.exports = router;
