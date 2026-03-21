jest.mock('../../../src/services/supabase');

const request = require('supertest');
const app = require('../../../src/index');
const { supabaseAdmin } = require('../../../src/services/supabase');

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

const setupAuthMocks = () => {
  supabaseAdmin.auth = {
    admin: {
      createUser: jest.fn().mockResolvedValue({
        data: { user: { id: USER_ID, email: 'test@example.com' } },
        error: null,
      }),
      deleteUser: jest.fn().mockResolvedValue({}),
      signOut: jest.fn().mockResolvedValue({}),
    },
    signInWithPassword: jest.fn().mockResolvedValue({ data: mockSession, error: null }),
    getUser: jest.fn().mockResolvedValue({
      data: { user: { id: USER_ID, email: 'test@example.com' } },
      error: null,
    }),
  };
  supabaseAdmin.from = jest.fn().mockReturnValue(makeChain({ data: mockProfile, error: null }));
};

beforeEach(() => {
  jest.clearAllMocks();
  setupAuthMocks();
});

// ----------------------------------------------------------------
// POST /api/v1/auth/register
// ----------------------------------------------------------------
describe('POST /api/v1/auth/register', () => {
  it('returns 201 with user and token on valid input', async () => {
    const res = await request(app).post('/api/v1/auth/register').send({
      email: 'test@example.com',
      password: 'password123',
      full_name: 'Test User',
    });

    expect(res.status).toBe(201);
    expect(res.body.data).toHaveProperty('token');
    expect(res.body.data).toHaveProperty('user');
  });

  it('returns 400 when email is invalid', async () => {
    const res = await request(app).post('/api/v1/auth/register').send({
      email: 'not-an-email',
      password: 'password123',
      full_name: 'Test User',
    });

    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe('VALIDATION_ERROR');
  });

  it('returns 400 when password is too short', async () => {
    const res = await request(app).post('/api/v1/auth/register').send({
      email: 'test@example.com',
      password: 'short',
      full_name: 'Test User',
    });

    expect(res.status).toBe(400);
  });

  it('returns 400 when full_name is missing', async () => {
    const res = await request(app).post('/api/v1/auth/register').send({
      email: 'test@example.com',
      password: 'password123',
    });

    expect(res.status).toBe(400);
  });

  it('returns 409 when email already exists', async () => {
    supabaseAdmin.auth.admin.createUser.mockResolvedValue({
      data: null,
      error: { message: 'User already registered', code: 'email_exists' },
    });

    const res = await request(app).post('/api/v1/auth/register').send({
      email: 'existing@example.com',
      password: 'password123',
      full_name: 'Existing User',
    });

    expect(res.status).toBe(409);
  });
});

// ----------------------------------------------------------------
// POST /api/v1/auth/login
// ----------------------------------------------------------------
describe('POST /api/v1/auth/login', () => {
  it('returns 200 with user and token on valid credentials', async () => {
    const res = await request(app).post('/api/v1/auth/login').send({
      email: 'test@example.com',
      password: 'password123',
    });

    expect(res.status).toBe(200);
    expect(res.body.data).toHaveProperty('token');
  });

  it('returns 401 on invalid credentials', async () => {
    supabaseAdmin.auth.signInWithPassword.mockResolvedValue({
      data: null,
      error: { message: 'Invalid login credentials' },
    });

    const res = await request(app).post('/api/v1/auth/login').send({
      email: 'bad@example.com',
      password: 'wrongpass',
    });

    expect(res.status).toBe(401);
  });

  it('returns 400 when email is missing', async () => {
    const res = await request(app).post('/api/v1/auth/login').send({
      password: 'password123',
    });

    expect(res.status).toBe(400);
  });

  it('returns 400 when password is missing', async () => {
    const res = await request(app).post('/api/v1/auth/login').send({
      email: 'test@example.com',
    });

    expect(res.status).toBe(400);
  });
});

// ----------------------------------------------------------------
// POST /api/v1/auth/logout
// ----------------------------------------------------------------
describe('POST /api/v1/auth/logout', () => {
  it('returns 200 when authenticated', async () => {
    const res = await request(app)
      .post('/api/v1/auth/logout')
      .set('Authorization', 'Bearer mock-jwt-token');

    expect(res.status).toBe(200);
    expect(res.body.data.message).toBe('Logged out successfully');
  });

  it('returns 401 when no token provided', async () => {
    const res = await request(app).post('/api/v1/auth/logout');
    expect(res.status).toBe(401);
  });
});

// ----------------------------------------------------------------
// GET /api/v1/auth/me
// ----------------------------------------------------------------
describe('GET /api/v1/auth/me', () => {
  it('returns the current user profile', async () => {
    const res = await request(app)
      .get('/api/v1/auth/me')
      .set('Authorization', 'Bearer mock-jwt-token');

    expect(res.status).toBe(200);
    expect(res.body.data).toHaveProperty('email', 'test@example.com');
  });

  it('returns 401 without a token', async () => {
    const res = await request(app).get('/api/v1/auth/me');
    expect(res.status).toBe(401);
  });

  it('returns 401 with malformed token', async () => {
    supabaseAdmin.auth.getUser.mockResolvedValue({
      data: { user: null },
      error: { message: 'Invalid token' },
    });

    const res = await request(app)
      .get('/api/v1/auth/me')
      .set('Authorization', 'Bearer bad-token');

    expect(res.status).toBe(401);
  });
});
