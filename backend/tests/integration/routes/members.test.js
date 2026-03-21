jest.mock('../../../src/services/supabase');
jest.mock('../../../src/services/activityService');

const request = require('supertest');
const app = require('../../../src/index');
const { supabaseAdmin } = require('../../../src/services/supabase');
const { logActivity } = require('../../../src/services/activityService');

const USER_ID = '22222222-2222-4222-b222-222222222222';
const PROJECT_ID = '11111111-1111-4111-a111-111111111111';
const NEW_USER_ID = '33333333-3333-4333-8333-333333333333';

const mockProfile = {
  id: USER_ID,
  email: 'user@example.com',
  full_name: 'Test User',
  role: 'member',
};

const mockMembership = {
  id: '44444444-4444-4444-a444-444444444444',
  project_id: PROJECT_ID,
  user_id: USER_ID,
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
    single: jest.fn().mockResolvedValue(res),
    then(resolve, reject) { return Promise.resolve(res).then(resolve, reject); },
    catch(reject) { return Promise.resolve(res).catch(reject); },
  };
  return chain;
};

const setupMocks = (responseList) => {
  let i = 0;
  supabaseAdmin.auth = {
    getUser: jest.fn().mockResolvedValue({
      data: { user: { id: USER_ID, email: mockProfile.email } },
      error: null,
    }),
  };
  supabaseAdmin.from = jest.fn().mockImplementation(() => {
    const res = responseList[i] !== undefined ? responseList[i] : responseList[responseList.length - 1];
    i++;
    return makeChain(res);
  });
};

beforeEach(() => {
  jest.clearAllMocks();
  logActivity.mockResolvedValue(undefined);
});

// ----------------------------------------------------------------
// GET /api/v1/projects/:id/members
// ----------------------------------------------------------------
describe('GET /api/v1/projects/:id/members', () => {
  it('returns 200 with members list', async () => {
    setupMocks([
      { data: mockProfile, error: null },          // auth middleware
      { data: { role: 'manager' }, error: null },  // requester membership
      { data: [mockMembership], error: null },     // members list
    ]);

    const res = await request(app)
      .get(`/api/v1/projects/${PROJECT_ID}/members`)
      .set('Authorization', 'Bearer mock-token');

    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty('data');
    expect(res.body).toHaveProperty('count');
  });

  it('returns 404 when user is not a project member', async () => {
    setupMocks([
      { data: mockProfile, error: null },
      { data: null, error: null },
    ]);

    const res = await request(app)
      .get(`/api/v1/projects/${PROJECT_ID}/members`)
      .set('Authorization', 'Bearer mock-token');

    expect(res.status).toBe(404);
  });
});

// ----------------------------------------------------------------
// POST /api/v1/projects/:id/members
// ----------------------------------------------------------------
describe('POST /api/v1/projects/:id/members', () => {
  it('returns 201 when adding a valid member', async () => {
    setupMocks([
      { data: mockProfile, error: null },
      { data: { role: 'manager' }, error: null },
      { data: { full_name: 'New User' }, error: null },
      { data: mockMembership, error: null },
    ]);

    const res = await request(app)
      .post(`/api/v1/projects/${PROJECT_ID}/members`)
      .set('Authorization', 'Bearer mock-token')
      .send({ user_id: NEW_USER_ID, role: 'developer' });

    expect(res.status).toBe(201);
  });

  it('returns 400 when user_id is not a valid UUID', async () => {
    setupMocks([{ data: mockProfile, error: null }]);

    const res = await request(app)
      .post(`/api/v1/projects/${PROJECT_ID}/members`)
      .set('Authorization', 'Bearer mock-token')
      .send({ user_id: 'not-a-uuid' });

    expect(res.status).toBe(400);
  });

  it('returns 400 when role is invalid', async () => {
    setupMocks([{ data: mockProfile, error: null }]);

    const res = await request(app)
      .post(`/api/v1/projects/${PROJECT_ID}/members`)
      .set('Authorization', 'Bearer mock-token')
      .send({ user_id: NEW_USER_ID, role: 'superadmin' });

    expect(res.status).toBe(400);
  });

  it('returns 409 when user is already a member', async () => {
    setupMocks([
      { data: mockProfile, error: null },
      { data: { role: 'manager' }, error: null },
      { data: { full_name: 'Existing User' }, error: null },
      { data: null, error: { code: '23505', message: 'duplicate key' } },
    ]);

    const res = await request(app)
      .post(`/api/v1/projects/${PROJECT_ID}/members`)
      .set('Authorization', 'Bearer mock-token')
      .send({ user_id: NEW_USER_ID });

    expect(res.status).toBe(409);
  });
});

// ----------------------------------------------------------------
// DELETE /api/v1/projects/:id/members/:userId
// ----------------------------------------------------------------
describe('DELETE /api/v1/projects/:id/members/:userId', () => {
  it('returns 204 when manager removes a member', async () => {
    setupMocks([
      { data: mockProfile, error: null },
      { data: { role: 'manager' }, error: null },
      { data: null, error: null },
    ]);

    const res = await request(app)
      .delete(`/api/v1/projects/${PROJECT_ID}/members/${NEW_USER_ID}`)
      .set('Authorization', 'Bearer mock-token');

    expect(res.status).toBe(204);
  });

  it('returns 400 when userId param is not a valid UUID', async () => {
    setupMocks([{ data: mockProfile, error: null }]);

    const res = await request(app)
      .delete(`/api/v1/projects/${PROJECT_ID}/members/not-a-uuid`)
      .set('Authorization', 'Bearer mock-token');

    expect(res.status).toBe(400);
  });

  it('returns 403 when developer tries to remove another member', async () => {
    setupMocks([
      { data: mockProfile, error: null },
      { data: { role: 'developer' }, error: null },
    ]);

    const res = await request(app)
      .delete(`/api/v1/projects/${PROJECT_ID}/members/${NEW_USER_ID}`)
      .set('Authorization', 'Bearer mock-token');

    expect(res.status).toBe(403);
  });
});
