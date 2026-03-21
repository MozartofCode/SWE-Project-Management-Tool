const issuesService = require('../services/issuesService');

const listIssues = async (req, res, next) => {
  try {
    const { status, priority, assignee_id, sort, order } = req.query;
    const issues = await issuesService.listIssues(
      req.params.id,
      req.user.id,
      { status, priority, assignee_id, sort, order }
    );
    res.status(200).json({ data: issues, count: issues.length });
  } catch (err) {
    next(err);
  }
};

const createIssue = async (req, res, next) => {
  try {
    const { title, description, status, priority, assignee_id, due_date } =
      req.body;
    const issue = await issuesService.createIssue(
      req.params.id,
      req.user.id,
      { title, description, status, priority, assignee_id, due_date }
    );
    res.status(201).json({ data: issue });
  } catch (err) {
    next(err);
  }
};

const getIssueById = async (req, res, next) => {
  try {
    const issue = await issuesService.getIssueById(
      req.params.id,
      req.params.issueId,
      req.user.id
    );
    res.status(200).json({ data: issue });
  } catch (err) {
    next(err);
  }
};

const updateIssue = async (req, res, next) => {
  try {
    const { title, description, status, priority, assignee_id, due_date } =
      req.body;
    const issue = await issuesService.updateIssue(
      req.params.id,
      req.params.issueId,
      req.user.id,
      { title, description, status, priority, assignee_id, due_date }
    );
    res.status(200).json({ data: issue });
  } catch (err) {
    next(err);
  }
};

const deleteIssue = async (req, res, next) => {
  try {
    await issuesService.deleteIssue(
      req.params.id,
      req.params.issueId,
      req.user.id
    );
    res.status(204).send();
  } catch (err) {
    next(err);
  }
};

module.exports = { listIssues, createIssue, getIssueById, updateIssue, deleteIssue };
