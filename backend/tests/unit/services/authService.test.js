jest.mock('../../../src/services/supabase');

const { supabaseAdmin } = require('../../../src/services/supabase');
const authService = require('../../../src/services/authService');

const USER_ID = '22222222-2222-4222-b222-222222222222';

const mockProfile = {
  id: USER_ID,
  email: 'test@example.com',
  full_name: 'Test User',
  role: 'member',
  created_at: '2026-01-01T00:00:00Z',
  updated_at: '2026-01-01T00:00:00Z',
};

const mockSession = {
  session: { access_token: 'mock-jwt-token' },
  user: { id: USER_ID, email: 'test@example.com' },
};

const makeChain = (res) => {
  const chain = {
    select: jest.fn().mockReturnThis(),
    eq: jest.fn().mockReturnThis(),
    insert: jest.fn().mockReturnThis(),
    single: jest.fn().mockResolvedValue(res),
    then(resolve, reject) { return Promise.resolve(res).then(resolve, reject); },
    catch(reject) { return Promise.resolve(res).catch(reject); },
  };
  return chain;
};

beforeEach(() => jest.clearAllMocks());

// ----------------------------------------------------------------
// register
// ----------------------------------------------------------------
describe('authService.register', () => {
  it('creates a user and returns profile + token', async () => {
    supabaseAdmin.auth = {
      admin: {
        createUser: jest.fn().mockResolvedValue({
          data: { user: { id: USER_ID, email: 'test@example.com' } },
          error: null,
        }),
        deleteUser: jest.fn(),
      },
      signInWithPassword: jest.fn().mockResolvedValue({ data: mockSession, error: null }),
    };
    supabaseAdmin.from = jest.fn().mockReturnValue(
      makeChain({ data: mockProfile, error: null })
    );

    const result = await authService.register({
      email: 'test@example.com',
      password: 'password123',
      full_name: 'Test User',
    });

    expect(supabaseAdmin.auth.admin.createUser).toHaveBeenCalledWith({
      email: 'test@example.com',
      password: 'password123',
      email_confirm: true,
    });
    expect(result.token).toBe('mock-jwt-token');
    expect(result.user).toEqual(mockProfile);
  });

  it('throws 409 when email already exists', async () => {
    supabaseAdmin.auth = {
      admin: {
        createUser: jest.fn().mockResolvedValue({
          data: null,
          error: { message: 'User already registered', code: 'email_exists' },
        }),
      },
    };

    await expect(
      authService.register({
        email: 'existing@example.com',
        password: 'password123',
        full_name: 'Existing User',
      })
    ).rejects.toMatchObject({ status: 409, code: 'EMAIL_EXISTS' });
  });

  it('rolls back auth user if profile insert fails', async () => {
    supabaseAdmin.auth = {
      admin: {
        createUser: jest.fn().mockResolvedValue({
          data: { user: { id: USER_ID } },
          error: null,
        }),
        deleteUser: jest.fn().mockResolvedValue({}),
      },
    };
    supabaseAdmin.from = jest.fn().mockReturnValue(
      makeChain({ data: null, error: { message: 'Profile insert failed' } })
    );

    await expect(
      authService.register({
        email: 'test@example.com',
        password: 'password123',
        full_name: 'Test User',
      })
    ).rejects.toMatchObject({ message: 'Profile insert failed' });

    expect(supabaseAdmin.auth.admin.deleteUser).toHaveBeenCalledWith(USER_ID);
  });
});

// ----------------------------------------------------------------
// login
// ----------------------------------------------------------------
describe('authService.login', () => {
  it('returns profile + token on valid credentials', async () => {
    supabaseAdmin.auth = {
      signInWithPassword: jest.fn().mockResolvedValue({ data: mockSession, error: null }),
    };
    supabaseAdmin.from = jest.fn().mockReturnValue(
      makeChain({ data: mockProfile, error: null })
    );

    const result = await authService.login({
      email: 'test@example.com',
      password: 'password123',
    });

    expect(result.token).toBe('mock-jwt-token');
    expect(result.user).toEqual(mockProfile);
  });

  it('throws 401 on invalid credentials', async () => {
    supabaseAdmin.auth = {
      signInWithPassword: jest.fn().mockResolvedValue({
        data: null,
        error: { message: 'Invalid login credentials' },
      }),
    };

    await expect(
      authService.login({ email: 'bad@example.com', password: 'wrongpass' })
    ).rejects.toMatchObject({ status: 401, code: 'INVALID_CREDENTIALS' });
  });
});

// ----------------------------------------------------------------
// logout
// ----------------------------------------------------------------
describe('authService.logout', () => {
  it('calls signOut without throwing', async () => {
    supabaseAdmin.auth = {
      admin: { signOut: jest.fn().mockResolvedValue({}) },
    };

    await expect(authService.logout(USER_ID)).resolves.toBeUndefined();
    expect(supabaseAdmin.auth.admin.signOut).toHaveBeenCalledWith(USER_ID);
  });

  it('does not throw even if signOut errors', async () => {
    supabaseAdmin.auth = {
      admin: { signOut: jest.fn().mockRejectedValue(new Error('signOut failed')) },
    };

    await expect(authService.logout(USER_ID)).resolves.toBeUndefined();
  });
});

// ----------------------------------------------------------------
// getMe
// ----------------------------------------------------------------
describe('authService.getMe', () => {
  it('returns the profile for the given user ID', async () => {
    supabaseAdmin.from = jest.fn().mockReturnValue(
      makeChain({ data: mockProfile, error: null })
    );

    const result = await authService.getMe(USER_ID);
    expect(result).toEqual(mockProfile);
  });

  it('throws 404 when profile not found', async () => {
    supabaseAdmin.from = jest.fn().mockReturnValue(
      makeChain({ data: null, error: null })
    );

    await expect(authService.getMe('nonexistent-id')).rejects.toMatchObject({
      status: 404,
      code: 'NOT_FOUND',
    });
  });
});
