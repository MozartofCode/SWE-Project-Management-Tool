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
import useIssues from './useIssues';

const ISSUES = [
  { id: 'i1', title: 'Bug one', status: 'open', priority: 'high' },
  { id: 'i2', title: 'Bug two', status: 'closed', priority: 'low' },
];

describe('useIssues', () => {
  beforeEach(() => vi.clearAllMocks());

  it('fetchIssues with no filters calls the correct endpoint', async () => {
    apiClient.get.mockResolvedValueOnce({ data: { data: ISSUES, count: 2 } });

    const { result } = renderHook(() => useIssues());
    await act(async () => { await result.current.fetchIssues('proj-1'); });

    expect(result.current.issues).toEqual(ISSUES);
    expect(result.current.count).toBe(2);
    expect(apiClient.get).toHaveBeenCalledWith('/projects/proj-1/issues', {
      params: { sort: 'created_at', order: 'desc' },
    });
  });

  it('fetchIssues only sends non-empty filter values as query params', async () => {
    apiClient.get.mockResolvedValueOnce({ data: { data: [], count: 0 } });

    const { result } = renderHook(() => useIssues());
    await act(async () => {
      await result.current.fetchIssues('proj-1', { status: 'open', priority: '', assignee_id: '' });
    });

    const callParams = apiClient.get.mock.calls[0][1].params;
    expect(callParams.status).toBe('open');
    expect(callParams.priority).toBeUndefined();
    expect(callParams.assignee_id).toBeUndefined();
  });

  it('setFilters merges partial updates', () => {
    const { result } = renderHook(() => useIssues());
    act(() => { result.current.setFilters({ status: 'open' }); });
    expect(result.current.filters.status).toBe('open');
    expect(result.current.filters.priority).toBe(''); // unchanged
  });

  it('createIssue calls POST /projects/:id/issues', async () => {
    const newIssue = { id: 'i3', title: 'New bug', status: 'open' };
    apiClient.post.mockResolvedValueOnce({ data: { data: newIssue } });

    const { result } = renderHook(() => useIssues());
    let returned;
    await act(async () => {
      returned = await result.current.createIssue('proj-1', { title: 'New bug' });
    });

    expect(apiClient.post).toHaveBeenCalledWith('/projects/proj-1/issues', { title: 'New bug' });
    expect(returned).toEqual(newIssue);
  });

  it('updateIssue calls PUT /projects/:id/issues/:issueId', async () => {
    const updated = { id: 'i1', title: 'Bug one', status: 'closed' };
    apiClient.put.mockResolvedValueOnce({ data: { data: updated } });

    const { result } = renderHook(() => useIssues());
    let returned;
    await act(async () => {
      returned = await result.current.updateIssue('proj-1', 'i1', { status: 'closed' });
    });

    expect(apiClient.put).toHaveBeenCalledWith('/projects/proj-1/issues/i1', { status: 'closed' });
    expect(returned).toEqual(updated);
  });

  it('deleteIssue calls DELETE /projects/:id/issues/:issueId', async () => {
    apiClient.delete.mockResolvedValueOnce({ data: null, status: 204 });

    const { result } = renderHook(() => useIssues());
    await act(async () => { await result.current.deleteIssue('proj-1', 'i1'); });

    expect(apiClient.delete).toHaveBeenCalledWith('/projects/proj-1/issues/i1');
  });
});
