const express = require('express');
const { param } = require('express-validator');

const { authenticate } = require('../middleware/auth');
const validate = require('../middleware/validate');

const router = express.Router();

// Phase 1 scaffold — reports are generated in Phase 2.
// These endpoints return empty data until Phase 2 is implemented.

router.use(authenticate);

router.get('/', (req, res) => {
  res.status(200).json({ data: [], count: 0 });
});

router.get(
  '/:id',
  [param('id').isUUID().withMessage('Valid report ID required')],
  validate,
  (req, res) => {
    res.status(404).json({
      error: { message: 'Report not found', code: 'NOT_FOUND' },
    });
  }
);

module.exports = router;
