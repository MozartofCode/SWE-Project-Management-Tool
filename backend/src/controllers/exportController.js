const { generateProjectExport, generateIssueExport } = require('../services/exportService');

async function exportProject(req, res, next) {
  try {
    if (!process.env.ANTHROPIC_API_KEY) {
      return res.status(503).json({
        error: { message: 'Export feature requires an Anthropic API key.', code: 'ANTHROPIC_NOT_CONFIGURED' },
      });
    }
    const { id } = req.params;
    const result = await generateProjectExport(id, req.user.id);
    res.json({ data: result });
  } catch (err) {
    next(err);
  }
}

async function exportIssue(req, res, next) {
  try {
    if (!process.env.ANTHROPIC_API_KEY) {
      return res.status(503).json({
        error: { message: 'Export feature requires an Anthropic API key.', code: 'ANTHROPIC_NOT_CONFIGURED' },
      });
    }
    const { id: projectId, issueId } = req.params;
    const result = await generateIssueExport(projectId, issueId);
    res.json({ data: result });
  } catch (err) {
    next(err);
  }
}

module.exports = { exportProject, exportIssue };
