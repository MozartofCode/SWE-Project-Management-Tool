jest.mock('../../../src/services/supabase');
jest.mock('../../../src/services/activityService');

const { supabaseAdmin } = require('../../../src/services/supabase');
const { logActivity } = require('../../../src/services/activityService');
const issuesService = require('../../../src/services/issuesService');

const PROJECT_ID = '11111111-1111-4111-a111-111111111111';
const ISSUE_ID = '55555555-5555-4555-a555-555555555555';
const USER_ID = '22222222-2222-4222-b222-222222222222';
const ASSIGNEE_ID = '33333333-3333-4333-8333-333333333333';

const mockIssue = {
  id: ISSUE_ID,
  project_id: PROJECT_ID,
  title: 'Test Issue',
  description: 'A test issue',
  status: 'open',
  priority: 'medium',
  assignee_id: null,
  reporter_id: USER_ID,
  due_date: null,
  closed_at: null,
  created_at: '2026-01-01T00:00:00Z',
  updated_at: '2026-01-01T00:00:00Z',
};

const makeChain = (res) => {
  const chain = {
    select: jest.fn().mockReturnThis(),
    eq: jest.fn().mockReturnThis(),
    in: jest.fn().mockReturnThis(),
    insert: jest.fn().mockReturnThis(),
    update: jest.fn().mockReturnThis(),
    delete: jest.fn().mockReturnThis(),
    order: jest.fn().mockReturnThis(),
    limit: jest.fn().mockReturnThis(),
    single: jest.fn().mockResolvedValue(res),
    then(resolve, reject) { return Promise.resolve(res).then(resolve, reject); },
    catch(reject) { return Promise.resolve(res).catch(reject); },
  };
  return chain;
};

const makeFrom = (responses) => {
  let i = 0;
  return jest.fn().mockImplementation(() => {
    const res = responses[i] !== undefined ? responses[i] : responses[responses.length - 1];
    i++;
    return makeChain(res);
  });
};

beforeEach(() => {
  jest.clearAllMocks();
  logActivity.mockResolvedValue(undefined);
});

// ----------------------------------------------------------------
// listIssues
// ----------------------------------------------------------------
describe('issuesService.listIssues', () => {
  it('returns issues when user is a member', async () => {
    supabaseAdmin.from = makeFrom([
      { data: { role: 'developer' }, error: null }, // membership
      { data: [mockIssue], error: null },           // issues
    ]);

    const result = await issuesService.listIssues(PROJECT_ID, USER_ID, {});
    expect(result).toEqual([mockIssue]);
  });

  it('throws 404 when user is not a member', async () => {
    supabaseAdmin.from = makeFrom([{ data: null, error: null }]);

    await expect(
      issuesService.listIssues(PROJECT_ID, USER_ID, {})
    ).rejects.toMatchObject({ status: 404, code: 'NOT_FOUND' });
  });
});

// ----------------------------------------------------------------
// createIssue
// ----------------------------------------------------------------
describe('issuesService.createIssue', () => {
  it('creates an issue and logs activity', async () => {
    supabaseAdmin.from = makeFrom([
      { data: { role: 'developer' }, error: null },
      { data: mockIssue, error: null },
    ]);

    const result = await issuesService.createIssue(PROJECT_ID, USER_ID, {
      title: 'Test Issue',
      priority: 'medium',
    });

    expect(result).toEqual(mockIssue);
    expect(logActivity).toHaveBeenCalledWith(
      expect.objectContaining({ action: 'created_issue' })
    );
  });

  it('validates assignee is a project member', async () => {
    supabaseAdmin.from = makeFrom([
      { data: { role: 'developer' }, error: null }, // creator membership
      { data: null, error: null },                  // assignee not a member
    ]);

    await expect(
      issuesService.createIssue(PROJECT_ID, USER_ID, {
        title: 'Test',
        assignee_id: ASSIGNEE_ID,
      })
    ).rejects.toMatchObject({ status: 400, code: 'INVALID_ASSIGNEE' });
  });
});

// ----------------------------------------------------------------
// getIssueById
// ----------------------------------------------------------------
describe('issuesService.getIssueById', () => {
  it('returns the issue when user is a member', async () => {
    supabaseAdmin.from = makeFrom([
      { data: { role: 'developer' }, error: null },
      { data: mockIssue, error: null },
    ]);

    const result = await issuesService.getIssueById(PROJECT_ID, ISSUE_ID, USER_ID);
    expect(result).toEqual(mockIssue);
  });

  it('throws 404 when issue does not exist', async () => {
    supabaseAdmin.from = makeFrom([
      { data: { role: 'developer' }, error: null },
      { data: null, error: null },
    ]);

    await expect(
      issuesService.getIssueById(PROJECT_ID, ISSUE_ID, USER_ID)
    ).rejects.toMatchObject({ status: 404, code: 'NOT_FOUND' });
  });
});

// ----------------------------------------------------------------
// updateIssue
// ----------------------------------------------------------------
describe('issuesService.updateIssue', () => {
  it('updates issue and logs updated_issue activity', async () => {
    const updated = { ...mockIssue, title: 'Updated Title' };
    supabaseAdmin.from = makeFrom([
      { data: { role: 'developer' }, error: null }, // membership
      { data: mockIssue, error: null },             // fetch current issue
      { data: updated, error: null },               // update result
    ]);

    const result = await issuesService.updateIssue(PROJECT_ID, ISSUE_ID, USER_ID, {
      title: 'Updated Title',
    });

    expect(result.title).toBe('Updated Title');
    expect(logActivity).toHaveBeenCalledWith(
      expect.objectContaining({ action: 'updated_issue' })
    );
  });

  it('sets closed_at and logs closed_issue when status changes to closed', async () => {
    const closed = { ...mockIssue, status: 'closed', closed_at: '2026-01-02T00:00:00Z' };
    supabaseAdmin.from = makeFrom([
      { data: { role: 'developer' }, error: null },
      { data: mockIssue, error: null },
      { data: closed, error: null },
    ]);

    await issuesService.updateIssue(PROJECT_ID, ISSUE_ID, USER_ID, { status: 'closed' });

    expect(logActivity).toHaveBeenCalledWith(
      expect.objectContaining({ action: 'closed_issue' })
    );
  });

  it('logs assigned_issue when assignee changes', async () => {
    const updated = { ...mockIssue, assignee_id: ASSIGNEE_ID };
    supabaseAdmin.from = makeFrom([
      { data: { role: 'developer' }, error: null },    // membership
      { data: mockIssue, error: null },                // current issue (assignee_id: null)
      { data: { role: 'developer' }, error: null },    // assignee membership check
      { data: updated, error: null },                  // update result
    ]);

    await issuesService.updateIssue(PROJECT_ID, ISSUE_ID, USER_ID, {
      assignee_id: ASSIGNEE_ID,
    });

    expect(logActivity).toHaveBeenCalledWith(
      expect.objectContaining({ action: 'assigned_issue' })
    );
  });

  it('throws 404 when issue not found', async () => {
    supabaseAdmin.from = makeFrom([
      { data: { role: 'developer' }, error: null },
      { data: null, error: null },
    ]);

    await expect(
      issuesService.updateIssue(PROJECT_ID, ISSUE_ID, USER_ID, { title: 'X' })
    ).rejects.toMatchObject({ status: 404, code: 'NOT_FOUND' });
  });
});

// ----------------------------------------------------------------
// deleteIssue
// ----------------------------------------------------------------
describe('issuesService.deleteIssue', () => {
  it('deletes when user is a member', async () => {
    supabaseAdmin.from = makeFrom([
      { data: { role: 'developer' }, error: null },
      { data: null, error: null },
    ]);

    await expect(
      issuesService.deleteIssue(PROJECT_ID, ISSUE_ID, USER_ID)
    ).resolves.toBeUndefined();
  });

  it('throws 404 when user is not a member', async () => {
    supabaseAdmin.from = makeFrom([{ data: null, error: null }]);

    await expect(
      issuesService.deleteIssue(PROJECT_ID, ISSUE_ID, USER_ID)
    ).rejects.toMatchObject({ status: 404, code: 'NOT_FOUND' });
  });
});
