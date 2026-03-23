const usersService = require('../services/usersService');

const listUsers = async (req, res, next) => {
  try {
    const users = await usersService.listUsers();
    res.status(200).json({ data: users, count: users.length });
  } catch (err) {
    next(err);
  }
};

const getUserById = async (req, res, next) => {
  try {
    const user = await usersService.getUserById(req.params.id);
    res.status(200).json({ data: user });
  } catch (err) {
    next(err);
  }
};

const updateUser = async (req, res, next) => {
  try {
    const { full_name, avatar_url } = req.body;
    const user = await usersService.updateUser(req.params.id, req.user.id, {
      full_name,
      avatar_url,
    });
    res.status(200).json({ data: user });
  } catch (err) {
    next(err);
  }
};

const getAnthropicKeyStatus = async (req, res, next) => {
  try {
    const status = await usersService.getAnthropicKeyStatus(req.user.id);
    res.status(200).json({ data: status });
  } catch (err) {
    next(err);
  }
};

const saveAnthropicKey = async (req, res, next) => {
  try {
    const { key } = req.body;
    await usersService.saveAnthropicKey(req.user.id, key);
    res.status(200).json({ data: { has_anthropic_key: !!key } });
  } catch (err) {
    next(err);
  }
};

module.exports = { listUsers, getUserById, updateUser, getAnthropicKeyStatus, saveAnthropicKey };
