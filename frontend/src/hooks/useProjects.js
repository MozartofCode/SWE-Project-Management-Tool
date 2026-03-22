import { useState, useCallback } from 'react';
import apiClient from '../services/api';
import { extractErrorMessage } from '../services/utils';

export default function useProjects() {
  const [projects, setProjects] = useState([]);
  const [count, setCount] = useState(0);
  const [selectedProject, setSelectedProject] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);

  const fetchProjects = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const res = await apiClient.get('/projects');
      setProjects(res.data.data);
      setCount(res.data.count);
    } catch (err) {
      setError(extractErrorMessage(err));
    } finally {
      setIsLoading(false);
    }
  }, []);

  const fetchProject = useCallback(async (id) => {
    setIsLoading(true);
    setError(null);
    try {
      const res = await apiClient.get(`/projects/${id}`);
      setSelectedProject(res.data.data);
      return res.data.data;
    } catch (err) {
      setError(extractErrorMessage(err));
      throw err;
    } finally {
      setIsLoading(false);
    }
  }, []);

  const createProject = useCallback(async (data) => {
    const res = await apiClient.post('/projects', data);
    return res.data.data;
  }, []);

  const updateProject = useCallback(async (id, data) => {
    const res = await apiClient.put(`/projects/${id}`, data);
    return res.data.data;
  }, []);

  const deleteProject = useCallback(async (id) => {
    await apiClient.delete(`/projects/${id}`);
    // 204 — no body
  }, []);

  return {
    projects,
    count,
    selectedProject,
    isLoading,
    error,
    fetchProjects,
    fetchProject,
    createProject,
    updateProject,
    deleteProject,
  };
}
