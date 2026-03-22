import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';

vi.mock('../services/api', () => ({
  default: {
    get: vi.fn(),
    post: vi.fn(),
    put: vi.fn(),
    delete: vi.fn(),
  },
  setAuthToken: vi.fn(),
  clearAuthToken: vi.fn(),
}));

import apiClient from '../services/api';
import useProjects from './useProjects';

const PROJECTS = [
  { id: 'p1', name: 'Alpha', status: 'active' },
  { id: 'p2', name: 'Beta', status: 'on_hold' },
];

describe('useProjects', () => {
  beforeEach(() => vi.clearAllMocks());

  it('fetchProjects sets projects and count', async () => {
    apiClient.get.mockResolvedValueOnce({ data: { data: PROJECTS, count: 2 } });

    const { result } = renderHook(() => useProjects());
    await act(async () => { await result.current.fetchProjects(); });

    expect(result.current.projects).toEqual(PROJECTS);
    expect(result.current.count).toBe(2);
    expect(result.current.isLoading).toBe(false);
    expect(apiClient.get).toHaveBeenCalledWith('/projects');
  });

  it('fetchProjects sets error on failure', async () => {
    const err = { response: { data: { error: { message: 'Unauthorized' } } } };
    apiClient.get.mockRejectedValueOnce(err);

    const { result } = renderHook(() => useProjects());
    await act(async () => { await result.current.fetchProjects(); });

    expect(result.current.error).toBe('Unauthorized');
    expect(result.current.projects).toEqual([]);
  });

  it('createProject calls POST /projects and returns data', async () => {
    const newProject = { id: 'p3', name: 'Gamma', status: 'active' };
    apiClient.post.mockResolvedValueOnce({ data: { data: newProject } });

    const { result } = renderHook(() => useProjects());
    let returned;
    await act(async () => {
      returned = await result.current.createProject({ name: 'Gamma' });
    });

    expect(apiClient.post).toHaveBeenCalledWith('/projects', { name: 'Gamma' });
    expect(returned).toEqual(newProject);
  });

  it('updateProject calls PUT /projects/:id', async () => {
    const updated = { id: 'p1', name: 'Alpha Updated', status: 'active' };
    apiClient.put.mockResolvedValueOnce({ data: { data: updated } });

    const { result } = renderHook(() => useProjects());
    let returned;
    await act(async () => {
      returned = await result.current.updateProject('p1', { name: 'Alpha Updated' });
    });

    expect(apiClient.put).toHaveBeenCalledWith('/projects/p1', { name: 'Alpha Updated' });
    expect(returned).toEqual(updated);
  });

  it('deleteProject calls DELETE /projects/:id (204 no body)', async () => {
    apiClient.delete.mockResolvedValueOnce({ data: null, status: 204 });

    const { result } = renderHook(() => useProjects());
    await act(async () => { await result.current.deleteProject('p1'); });

    expect(apiClient.delete).toHaveBeenCalledWith('/projects/p1');
  });

  it('sets isLoading true during fetch and false after', async () => {
    let resolveGet;
    apiClient.get.mockReturnValueOnce(new Promise((res) => { resolveGet = res; }));

    const { result } = renderHook(() => useProjects());
    act(() => { result.current.fetchProjects(); });
    expect(result.current.isLoading).toBe(true);

    await act(async () => { resolveGet({ data: { data: [], count: 0 } }); });
    expect(result.current.isLoading).toBe(false);
  });
});
