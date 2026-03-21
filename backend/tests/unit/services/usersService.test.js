jest.mock('../../../src/services/supabase');

const { supabaseAdmin } = require('../../../src/services/supabase');
const usersService = require('../../../src/services/usersService');

const USER_ID = '22222222-2222-4222-b222-222222222222';
const OTHER_ID = '33333333-3333-4333-c333-333333333333';

const mockProfile = {
  id: USER_ID,
  email: 'test@example.com',
  full_name: 'Test User',
  role: 'member',
  avatar_url: null,
  created_at: '2026-01-01T00:00:00Z',
  updated_at: '2026-01-01T00:00:00Z',
};

const makeChain = (res) => {
  const chain = {
    select: jest.fn().mockReturnThis(),
    eq: jest.fn().mockReturnThis(),
    order: jest.fn().mockReturnThis(),
    update: jest.fn().mockReturnThis(),
    single: jest.fn().mockResolvedValue(res),
    then(resolve, reject) { return Promise.resolve(res).then(resolve, reject); },
    catch(reject) { return Promise.resolve(res).catch(reject); },
  };
  return chain;
};

beforeEach(() => jest.clearAllMocks());

// ----------------------------------------------------------------
// listUsers
// ----------------------------------------------------------------
describe('usersService.listUsers', () => {
  it('returns all users ordered by created_at', async () => {
    supabaseAdmin.from = jest.fn().mockReturnValue(
      makeChain({ data: [mockProfile], error: null })
    );

    const result = await usersService.listUsers();
    expect(result).toEqual([mockProfile]);
    expect(supabaseAdmin.from).toHaveBeenCalledWith('profiles');
  });

  it('throws on Supabase error', async () => {
    supabaseAdmin.from = jest.fn().mockReturnValue(
      makeChain({ data: null, error: { message: 'DB error' } })
    );

    await expect(usersService.listUsers()).rejects.toMatchObject({ message: 'DB error' });
  });
});

// ----------------------------------------------------------------
// getUserById
// ----------------------------------------------------------------
describe('usersService.getUserById', () => {
  it('returns a user by ID', async () => {
    supabaseAdmin.from = jest.fn().mockReturnValue(
      makeChain({ data: mockProfile, error: null })
    );

    const result = await usersService.getUserById(USER_ID);
    expect(result).toEqual(mockProfile);
  });

  it('throws 404 when user not found (PGRST116)', async () => {
    supabaseAdmin.from = jest.fn().mockReturnValue(
      makeChain({ data: null, error: { code: 'PGRST116', message: 'Not found' } })
    );

    await expect(usersService.getUserById(OTHER_ID)).rejects.toMatchObject({
      status: 404,
      code: 'NOT_FOUND',
    });
  });

  it('throws on other Supabase errors', async () => {
    supabaseAdmin.from = jest.fn().mockReturnValue(
      makeChain({ data: null, error: { code: '500', message: 'Server error' } })
    );

    await expect(usersService.getUserById(USER_ID)).rejects.toMatchObject({
      message: 'Server error',
    });
  });
});

// ----------------------------------------------------------------
// updateUser
// ----------------------------------------------------------------
describe('usersService.updateUser', () => {
  it('updates and returns the profile when requester is the owner', async () => {
    const updated = { ...mockProfile, full_name: 'Updated Name' };
    supabaseAdmin.from = jest.fn().mockReturnValue(
      makeChain({ data: updated, error: null })
    );

    const result = await usersService.updateUser(USER_ID, USER_ID, {
      full_name: 'Updated Name',
    });

    expect(result.full_name).toBe('Updated Name');
  });

  it('throws 403 when requester is not the owner', async () => {
    await expect(
      usersService.updateUser(USER_ID, OTHER_ID, { full_name: 'Hacker' })
    ).rejects.toMatchObject({ status: 403, code: 'FORBIDDEN' });
  });
});
