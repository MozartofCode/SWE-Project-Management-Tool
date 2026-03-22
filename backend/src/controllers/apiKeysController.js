const { listApiKeys, createApiKey, revokeApiKey } = require('../services/apiKeysService');

const list = async (req, res, next) => {
  try {
    const keys = await listApiKeys(req.user.id);
    res.json({ data: keys, count: keys.length });
  } catch (err) {
    next(err);
  }
};

const create = async (req, res, next) => {
  try {
    const { name } = req.body;
    const key = await createApiKey(req.user.id, name);
    res.status(201).json({ data: key });
  } catch (err) {
    next(err);
  }
};

const revoke = async (req, res, next) => {
  try {
    await revokeApiKey(req.user.id, req.params.id);
    res.status(204).end();
  } catch (err) {
    next(err);
  }
};

module.exports = { list, create, revoke };
