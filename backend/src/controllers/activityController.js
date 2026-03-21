const activityService = require('../services/activityService');

const getRecentActivity = async (req, res, next) => {
  try {
    const limit = parseInt(req.query.limit, 10) || 20;
    const logs = await activityService.getRecentActivity(req.user.id, limit);
    res.status(200).json({ data: logs, count: logs.length });
  } catch (err) {
    next(err);
  }
};

const getProjectActivity = async (req, res, next) => {
  try {
    const limit = parseInt(req.query.limit, 10) || 50;
    const logs = await activityService.getProjectActivity(req.params.id, limit);
    res.status(200).json({ data: logs, count: logs.length });
  } catch (err) {
    next(err);
  }
};

module.exports = { getRecentActivity, getProjectActivity };
