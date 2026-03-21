jest.mock('../../../src/services/supabase');

const request = require('supertest');
const app = require('../../../src/index');
const { supabaseAdmin } = require('../../../src/services/supabase');

const ADMIN_ID = '11111111-1111-4111-a111-111111111111';
const MEMBER_ID = '22222222-2222-4222-b222-222222222222';

const mockAdminProfile = {
  id: ADMIN_ID,
  email: 'admin@example.com',
  full_name: 'Admin User',
  role: 'admin',
  created_at: '2026-01-01T00:00:00Z',
  updated_at: '2026-01-01T00:00:00Z',
};

const mockMemberProfile = {
  id: MEMBER_ID,
  email: 'member@example.com',
  full_name: 'Member User',
  role: 'member',
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

const setupMocks = (profile, responseList) => {
  let i = 0;
  supabaseAdmin.auth = {
    getUser: jest.fn().mockResolvedValue({
      data: { user: { id: profile.id, email: profile.email } },
      error: null,
    }),
  };
  supabaseAdmin.from = jest.fn().mockImplementation(() => {
    // First call is always auth middleware profile lookup
    const res = responseList[i] !== undefined ? responseList[i] : responseList[responseList.length - 1];
    i++;
    return makeChain(res);
  });
};

beforeEach(() => jest.clearAllMocks());

// ----------------------------------------------------------------
// GET /api/v1/users — admin only
// ----------------------------------------------------------------
describe('GET /api/v1/users', () => {
  it('returns 200 with all users when requester is admin', async () => {
    setupMocks(mockAdminProfile, [
      { data: mockAdminProfile, error: null },               // auth middleware
      { data: [mockAdminProfile, mockMemberProfile], error: null }, // listUsers
    ]);

    const res = await request(app)
      .get('/api/v1/users')
      .set('Authorization', 'Bearer mock-token');

    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty('data');
    expect(res.body).toHaveProperty('count');
  });

  it('returns 403 when requester is not admin', async () => {
    setupMocks(mockMemberProfile, [
      { data: mockMemberProfile, error: null },
    ]);

    const res = await request(app)
      .get('/api/v1/users')
      .set('Authorization', 'Bearer mock-token');

    expect(res.status).toBe(403);
  });

  it('returns 401 without token', async () => {
    const res = await request(app).get('/api/v1/users');
    expect(res.status).toBe(401);
  });
});

// ----------------------------------------------------------------
// GET /api/v1/users/:id
// ----------------------------------------------------------------
describe('GET /api/v1/users/:id', () => {
  it('returns 200 with user profile', async () => {
    setupMocks(mockMemberProfile, [
      { data: mockMemberProfile, error: null }, // auth middleware
      { data: mockMemberProfile, error: null }, // getUserById
    ]);

    const res = await request(app)
      .get(`/api/v1/users/${MEMBER_ID}`)
      .set('Authorization', 'Bearer mock-token');

    expect(res.status).toBe(200);
    expect(res.body.data.email).toBe('member@example.com');
  });

  it('returns 404 when user not found', async () => {
    setupMocks(mockMemberProfile, [
      { data: mockMemberProfile, error: null },
      { data: null, error: { code: 'PGRST116', message: 'Not found' } },
    ]);

    const res = await request(app)
      .get(`/api/v1/users/${ADMIN_ID}`)
      .set('Authorization', 'Bearer mock-token');

    expect(res.status).toBe(404);
  });

  it('returns 400 for invalid UUID', async () => {
    setupMocks(mockMemberProfile, [{ data: mockMemberProfile, error: null }]);

    const res = await request(app)
      .get('/api/v1/users/not-a-uuid')
      .set('Authorization', 'Bearer mock-token');

    expect(res.status).toBe(400);
  });
});

// ----------------------------------------------------------------
// PUT /api/v1/users/:id
// ----------------------------------------------------------------
describe('PUT /api/v1/users/:id', () => {
  it('returns 200 when updating own profile', async () => {
    const updated = { ...mockMemberProfile, full_name: 'Updated Name' };
    setupMocks(mockMemberProfile, [
      { data: mockMemberProfile, error: null }, // auth middleware
      { data: updated, error: null },           // updateUser
    ]);

    const res = await request(app)
      .put(`/api/v1/users/${MEMBER_ID}`)
      .set('Authorization', 'Bearer mock-token')
      .send({ full_name: 'Updated Name' });

    expect(res.status).toBe(200);
    expect(res.body.data.full_name).toBe('Updated Name');
  });

  it('returns 403 when updating someone else\'s profile', async () => {
    setupMocks(mockMemberProfile, [
      { data: mockMemberProfile, error: null }, // auth middleware
    ]);

    const res = await request(app)
      .put(`/api/v1/users/${ADMIN_ID}`)
      .set('Authorization', 'Bearer mock-token')
      .send({ full_name: 'Hacker' });

    expect(res.status).toBe(403);
  });

  it('returns 400 for invalid avatar_url', async () => {
    setupMocks(mockMemberProfile, [{ data: mockMemberProfile, error: null }]);

    const res = await request(app)
      .put(`/api/v1/users/${MEMBER_ID}`)
      .set('Authorization', 'Bearer mock-token')
      .send({ avatar_url: 'not-a-url' });

    expect(res.status).toBe(400);
  });

  it('returns 400 for invalid UUID param', async () => {
    setupMocks(mockMemberProfile, [{ data: mockMemberProfile, error: null }]);

    const res = await request(app)
      .put('/api/v1/users/not-a-uuid')
      .set('Authorization', 'Bearer mock-token')
      .send({ full_name: 'Test' });

    expect(res.status).toBe(400);
  });
});
