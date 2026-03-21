jest.mock('../../../src/services/supabase');
jest.mock('../../../src/services/activityService');

const { supabaseAdmin } = require('../../../src/services/supabase');
const { logActivity } = require('../../../src/services/activityService');
const membersService = require('../../../src/services/membersService');

const PROJECT_ID = '11111111-1111-4111-a111-111111111111';
const REQUESTER_ID = '22222222-2222-4222-b222-222222222222';
const TARGET_ID = '33333333-3333-4333-8333-333333333333';

const mockMembership = {
  id: '44444444-4444-4444-a444-444444444444',
  project_id: PROJECT_ID,
  user_id: REQUESTER_ID,
  role: 'manager',
  joined_at: '2026-01-01T00:00:00Z',
};

const makeChain = (res) => {
  const chain = {
    select: jest.fn().mockReturnThis(),
    eq: jest.fn().mockReturnThis(),
    insert: jest.fn().mockReturnThis(),
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
// listMembers
// ----------------------------------------------------------------
describe('membersService.listMembers', () => {
  it('returns members when requester is a member', async () => {
    supabaseAdmin.from = makeFrom([
      { data: { role: 'manager' }, error: null },  // requester membership
      { data: [mockMembership], error: null },     // members list
    ]);

    const result = await membersService.listMembers(PROJECT_ID, REQUESTER_ID);
    expect(result).toEqual([mockMembership]);
  });

  it('throws 404 when requester is not a member', async () => {
    supabaseAdmin.from = makeFrom([{ data: null, error: null }]);

    await expect(
      membersService.listMembers(PROJECT_ID, REQUESTER_ID)
    ).rejects.toMatchObject({ status: 404, code: 'NOT_FOUND' });
  });
});

// ----------------------------------------------------------------
// addMember
// ----------------------------------------------------------------
describe('membersService.addMember', () => {
  it('adds a member and logs activity', async () => {
    supabaseAdmin.from = makeFrom([
      { data: { role: 'manager' }, error: null },       // requester membership
      { data: { full_name: 'New User' }, error: null }, // target profile
      { data: mockMembership, error: null },            // insert result
    ]);

    const result = await membersService.addMember(PROJECT_ID, REQUESTER_ID, {
      user_id: TARGET_ID,
      role: 'developer',
    });

    expect(result).toEqual(mockMembership);
    expect(logActivity).toHaveBeenCalledWith(
      expect.objectContaining({ action: 'added_member' })
    );
  });

  it('throws 403 when requester is a viewer', async () => {
    supabaseAdmin.from = makeFrom([{ data: { role: 'viewer' }, error: null }]);

    await expect(
      membersService.addMember(PROJECT_ID, REQUESTER_ID, { user_id: TARGET_ID })
    ).rejects.toMatchObject({ status: 403, code: 'FORBIDDEN' });
  });

  it('throws 403 when requester is not a member', async () => {
    supabaseAdmin.from = makeFrom([{ data: null, error: null }]);

    await expect(
      membersService.addMember(PROJECT_ID, REQUESTER_ID, { user_id: TARGET_ID })
    ).rejects.toMatchObject({ status: 403, code: 'FORBIDDEN' });
  });

  it('throws 404 when target user does not exist', async () => {
    supabaseAdmin.from = makeFrom([
      { data: { role: 'manager' }, error: null },
      { data: null, error: null },
    ]);

    await expect(
      membersService.addMember(PROJECT_ID, REQUESTER_ID, { user_id: TARGET_ID })
    ).rejects.toMatchObject({ status: 404, code: 'NOT_FOUND' });
  });

  it('throws 409 when user is already a member', async () => {
    supabaseAdmin.from = makeFrom([
      { data: { role: 'manager' }, error: null },
      { data: { full_name: 'Existing User' }, error: null },
      { data: null, error: { code: '23505', message: 'duplicate key' } },
    ]);

    await expect(
      membersService.addMember(PROJECT_ID, REQUESTER_ID, { user_id: TARGET_ID })
    ).rejects.toMatchObject({ status: 409, code: 'CONFLICT' });
  });
});

// ----------------------------------------------------------------
// removeMember
// ----------------------------------------------------------------
describe('membersService.removeMember', () => {
  it('allows manager to remove another member', async () => {
    supabaseAdmin.from = makeFrom([
      { data: { role: 'manager' }, error: null },
      { data: null, error: null },
    ]);

    await expect(
      membersService.removeMember(PROJECT_ID, REQUESTER_ID, TARGET_ID)
    ).resolves.toBeUndefined();
  });

  it('allows a member to remove themselves', async () => {
    supabaseAdmin.from = makeFrom([
      { data: { role: 'developer' }, error: null },
      { data: null, error: null },
    ]);

    await expect(
      membersService.removeMember(PROJECT_ID, REQUESTER_ID, REQUESTER_ID)
    ).resolves.toBeUndefined();
  });

  it('throws 403 when non-manager tries to remove someone else', async () => {
    supabaseAdmin.from = makeFrom([
      { data: { role: 'developer' }, error: null },
    ]);

    await expect(
      membersService.removeMember(PROJECT_ID, REQUESTER_ID, TARGET_ID)
    ).rejects.toMatchObject({ status: 403, code: 'FORBIDDEN' });
  });

  it('throws 404 when requester is not a member', async () => {
    supabaseAdmin.from = makeFrom([{ data: null, error: null }]);

    await expect(
      membersService.removeMember(PROJECT_ID, REQUESTER_ID, TARGET_ID)
    ).rejects.toMatchObject({ status: 404, code: 'NOT_FOUND' });
  });
});
