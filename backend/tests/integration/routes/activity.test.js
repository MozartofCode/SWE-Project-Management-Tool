jest.mock('../../../src/services/supabase');

const request = require('supertest');
const app = require('../../../src/index');
const { supabaseAdmin } = require('../../../src/services/supabase');

const USER_ID = '22222222-2222-4222-b222-222222222222';
const PROJECT_ID = '11111111-1111-4111-a111-111111111111';

const mockProfile = {
  id: USER_ID,
  email: 'user@example.com',
  full_name: 'Test User',
  role: 'member',
};

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
    order: jest.fn().mockReturnThis(),
    limit: jest.fn().mockReturnThis(),
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

beforeEach(() => jest.clearAllMocks());

// ----------------------------------------------------------------
// GET /api/v1/activity
// ----------------------------------------------------------------
describe('GET /api/v1/activity', () => {
  it('returns 200 with recent activity', async () => {
    setupMocks([
      { data: mockProfile, error: null },                  // auth middleware
      { data: [{ project_id: PROJECT_ID }], error: null }, // memberships
      { data: [mockLog], error: null },                    // logs
    ]);

    const res = await request(app)
      .get('/api/v1/activity')
      .set('Authorization', 'Bearer mock-token');

    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty('data');
    expect(res.body).toHaveProperty('count');
    expect(res.body.count).toBe(1);
  });

  it('returns 401 without token', async () => {
    const res = await request(app).get('/api/v1/activity');
    expect(res.status).toBe(401);
  });

  it('returns empty array when user has no projects', async () => {
    setupMocks([
      { data: mockProfile, error: null },
      { data: [], error: null },
    ]);

    const res = await request(app)
      .get('/api/v1/activity')
      .set('Authorization', 'Bearer mock-token');

    expect(res.status).toBe(200);
    expect(res.body.data).toEqual([]);
    expect(res.body.count).toBe(0);
  });
});

// ----------------------------------------------------------------
// GET /api/v1/projects/:id/activity
// ----------------------------------------------------------------
describe('GET /api/v1/projects/:id/activity', () => {
  it('returns 200 with project-specific activity', async () => {
    setupMocks([
      { data: mockProfile, error: null },   // auth middleware
      { data: [mockLog], error: null },     // project activity
    ]);

    const res = await request(app)
      .get(`/api/v1/projects/${PROJECT_ID}/activity`)
      .set('Authorization', 'Bearer mock-token');

    expect(res.status).toBe(200);
    expect(res.body.data[0].project_id).toBe(PROJECT_ID);
  });

  it('returns 400 for invalid project UUID', async () => {
    setupMocks([{ data: mockProfile, error: null }]);

    const res = await request(app)
      .get('/api/v1/projects/not-a-uuid/activity')
      .set('Authorization', 'Bearer mock-token');

    expect(res.status).toBe(400);
  });

  it('returns 401 without token', async () => {
    const res = await request(app).get(`/api/v1/projects/${PROJECT_ID}/activity`);
    expect(res.status).toBe(401);
  });
});
