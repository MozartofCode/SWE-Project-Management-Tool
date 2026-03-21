const projectsService = require('../services/projectsService');

const listProjects = async (req, res, next) => {
  try {
    const projects = await projectsService.listProjects(req.user.id);
    res.status(200).json({ data: projects, count: projects.length });
  } catch (err) {
    next(err);
  }
};

const createProject = async (req, res, next) => {
  try {
    const { name, description, status, start_date, end_date } = req.body;
    const project = await projectsService.createProject(req.user.id, {
      name,
      description,
      status,
      start_date,
      end_date,
    });
    res.status(201).json({ data: project });
  } catch (err) {
    next(err);
  }
};

const getProjectById = async (req, res, next) => {
  try {
    const project = await projectsService.getProjectById(
      req.params.id,
      req.user.id
    );
    res.status(200).json({ data: project });
  } catch (err) {
    next(err);
  }
};

const updateProject = async (req, res, next) => {
  try {
    const { name, description, status, start_date, end_date } = req.body;
    const project = await projectsService.updateProject(
      req.params.id,
      req.user.id,
      { name, description, status, start_date, end_date }
    );
    res.status(200).json({ data: project });
  } catch (err) {
    next(err);
  }
};

const deleteProject = async (req, res, next) => {
  try {
    await projectsService.deleteProject(
      req.params.id,
      req.user.id,
      req.user.role
    );
    res.status(204).send();
  } catch (err) {
    next(err);
  }
};

module.exports = {
  listProjects,
  createProject,
  getProjectById,
  updateProject,
  deleteProject,
};
