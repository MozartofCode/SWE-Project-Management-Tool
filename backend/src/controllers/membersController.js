const membersService = require('../services/membersService');

const listMembers = async (req, res, next) => {
  try {
    const members = await membersService.listMembers(req.params.id, req.user.id);
    res.status(200).json({ data: members, count: members.length });
  } catch (err) {
    next(err);
  }
};

const addMember = async (req, res, next) => {
  try {
    const { user_id, role } = req.body;
    const member = await membersService.addMember(req.params.id, req.user.id, {
      user_id,
      role,
    });
    res.status(201).json({ data: member });
  } catch (err) {
    next(err);
  }
};

const removeMember = async (req, res, next) => {
  try {
    await membersService.removeMember(
      req.params.id,
      req.user.id,
      req.params.userId
    );
    res.status(204).send();
  } catch (err) {
    next(err);
  }
};

module.exports = { listMembers, addMember, removeMember };
