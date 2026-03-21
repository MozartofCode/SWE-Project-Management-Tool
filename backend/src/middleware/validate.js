const { validationResult } = require('express-validator');

const validate = (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({
      error: {
        message: errors.array()[0].msg,
        code: 'VALIDATION_ERROR',
        details: errors.array(),
      },
    });
  }
  next();
};

module.exports = validate;
