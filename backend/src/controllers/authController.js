const authService = require('../services/authService');

const register = async (req, res, next) => {
  try {
    const { email, password, full_name } = req.body;
    const result = await authService.register({ email, password, full_name });
    res.status(201).json({ data: result });
  } catch (err) {
    next(err);
  }
};

const login = async (req, res, next) => {
  try {
    const { email, password } = req.body;
    const result = await authService.login({ email, password });
    res.status(200).json({ data: result });
  } catch (err) {
    next(err);
  }
};

const logout = async (req, res, next) => {
  try {
    await authService.logout(req.user.id);
    res.status(200).json({ data: { message: 'Logged out successfully' } });
  } catch (err) {
    next(err);
  }
};

const getMe = async (req, res, next) => {
  try {
    const profile = await authService.getMe(req.user.id);
    res.status(200).json({ data: profile });
  } catch (err) {
    next(err);
  }
};

module.exports = { register, login, logout, getMe };
