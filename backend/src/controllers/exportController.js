const { generateProjectExport, generateIssueExport } = require('../services/exportService');

async function exportProject(req, res, next) {
  try {
    const result = await generateProjectExport(req.params.id, req.user.id);
    res.json({ data: result });
  } catch (err) {
    next(err);
  }
}

async function exportIssue(req, res, next) {
  try {
    const { id: projectId, issueId } = req.params;
    const result = await generateIssueExport(projectId, issueId, req.user.id);
    res.json({ data: result });
  } catch (err) {
    next(err);
  }
}

module.exports = { exportProject, exportIssue };
