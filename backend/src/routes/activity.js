const express = require('express');
const { param } = require('express-validator');

const activityController = require('../controllers/activityController');
const { authenticate } = require('../middleware/auth');
const validate = require('../middleware/validate');

const router = express.Router();

// GET /api/v1/activity — recent activity across all user's projects
router.get('/', authenticate, activityController.getRecentActivity);

module.exports = router;

// Separate export for use as nested router under /projects/:id/activity
const nestedRouter = express.Router({ mergeParams: true });

nestedRouter.get(
  '/',
  [param('id').isUUID().withMessage('Valid project ID required')],
  validate,
  activityController.getProjectActivity
);

module.exports.nestedRouter = nestedRouter;
