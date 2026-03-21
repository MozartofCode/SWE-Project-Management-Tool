jest.mock('../../../src/services/supabase');

const { supabaseAdmin } = require('../../../src/services/supabase');
const activityService = require('../../../src/services/activityService');

const PROJECT_ID = '11111111-1111-4111-a111-111111111111';
const USER_ID = '22222222-2222-4222-b222-222222222222';

const mockLog = {
  id: '66666666-6666-4666-a666-666666666666',
  project_id: PROJECT_ID,
  issue_id: null,
  user_id: USER_ID,
  action: 'created_project',
  description: 'Project was created',
  metadata: null,
  created_at: '2026-01-01T00:00:00Z',
};

const makeChain = (res) => {
  const chain = {
    select: jest.fn().mockReturnThis(),
    eq: jest.fn().mockReturnThis(),
    in: jest.fn().mockReturnThis(),
    insert: jest.fn().mockReturnThis(),
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

beforeEach(() => jest.clearAllMocks());

// ----------------------------------------------------------------
// logActivity
// ----------------------------------------------------------------
describe('activityService.logActivity', () => {
  it('writes an activity log entry', async () => {
    supabaseAdmin.from = makeFrom([{ data: mockLog, error: null }]);

    const result = await activityService.logActivity({
      project_id: PROJECT_ID,
      user_id: USER_ID,
      action: 'created_project',
      description: 'Project was created',
    });

    expect(result).toEqual(mockLog);
  });

  it('does not throw on Supabase error — silently logs to console', async () => {
    supabaseAdmin.from = makeFrom([{ data: null, error: { message: 'Insert failed' } }]);
    const consoleSpy = jest.spyOn(console, 'error').mockImplementation(() => {});

    const result = await activityService.logActivity({
      project_id: PROJECT_ID,
      user_id: USER_ID,
      action: 'created_project',
      description: 'Something',
    });

    expect(result).toBeUndefined();
    expect(consoleSpy).toHaveBeenCalled();
    consoleSpy.mockRestore();
  });
});

// ----------------------------------------------------------------
// getRecentActivity
// ----------------------------------------------------------------
describe('activityService.getRecentActivity', () => {
  it('returns recent logs across all user projects', async () => {
    supabaseAdmin.from = makeFrom([
      { data: [{ project_id: PROJECT_ID }], error: null }, // memberships
      { data: [mockLog], error: null },                    // logs
    ]);

    const result = await activityService.getRecentActivity(USER_ID, 20);
    expect(result).toEqual([mockLog]);
  });

  it('returns empty array when user has no project memberships', async () => {
    supabaseAdmin.from = makeFrom([{ data: [], error: null }]);

    const result = await activityService.getRecentActivity(USER_ID, 20);
    expect(result).toEqual([]);
    expect(supabaseAdmin.from).toHaveBeenCalledTimes(1);
  });

  it('throws on Supabase error fetching memberships', async () => {
    supabaseAdmin.from = makeFrom([{ data: null, error: { message: 'Query failed' } }]);

    await expect(
      activityService.getRecentActivity(USER_ID, 20)
    ).rejects.toMatchObject({ message: 'Query failed' });
  });
});

// ----------------------------------------------------------------
// getProjectActivity
// ----------------------------------------------------------------
describe('activityService.getProjectActivity', () => {
  it('returns activity logs for a specific project', async () => {
    supabaseAdmin.from = makeFrom([{ data: [mockLog], error: null }]);

    const result = await activityService.getProjectActivity(PROJECT_ID, 50);
    expect(result).toEqual([mockLog]);
  });

  it('throws on Supabase error', async () => {
    supabaseAdmin.from = makeFrom([{ data: null, error: { message: 'Query failed' } }]);

    await expect(
      activityService.getProjectActivity(PROJECT_ID, 50)
    ).rejects.toMatchObject({ message: 'Query failed' });
  });
});
