import { useState, useCallback } from 'react';
import apiClient from '../services/api';
import { extractErrorMessage } from '../services/utils';

const DEFAULT_FILTERS = {
  status: '',
  priority: '',
  assignee_id: '',
  sort: 'created_at',
  order: 'desc',
};

export default function useIssues() {
  const [issues, setIssues] = useState([]);
  const [count, setCount] = useState(0);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);
  const [filters, setFiltersState] = useState(DEFAULT_FILTERS);

  const buildParams = (f) =>
    Object.entries(f).reduce((acc, [k, v]) => {
      if (v !== '') acc[k] = v;
      return acc;
    }, {});

  const fetchIssues = useCallback(async (projectId, filterOverrides = {}) => {
    setIsLoading(true);
    setError(null);
    try {
      const merged = { ...filters, ...filterOverrides };
      const params = buildParams(merged);
      const res = await apiClient.get(`/projects/${projectId}/issues`, { params });
      setIssues(res.data.data);
      setCount(res.data.count);
    } catch (err) {
      setError(extractErrorMessage(err));
    } finally {
      setIsLoading(false);
    }
  }, [filters]);

  const setFilters = useCallback((partial) => {
    setFiltersState((prev) => ({ ...prev, ...partial }));
  }, []);

  const resetFilters = useCallback(() => {
    setFiltersState(DEFAULT_FILTERS);
  }, []);

  const createIssue = useCallback(async (projectId, data) => {
    const res = await apiClient.post(`/projects/${projectId}/issues`, data);
    return res.data.data;
  }, []);

  const updateIssue = useCallback(async (projectId, issueId, data) => {
    const res = await apiClient.put(`/projects/${projectId}/issues/${issueId}`, data);
    return res.data.data;
  }, []);

  const deleteIssue = useCallback(async (projectId, issueId) => {
    await apiClient.delete(`/projects/${projectId}/issues/${issueId}`);
    // 204 — no body
  }, []);

  return {
    issues,
    count,
    isLoading,
    error,
    filters,
    fetchIssues,
    setFilters,
    resetFilters,
    createIssue,
    updateIssue,
    deleteIssue,
  };
}
