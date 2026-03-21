jest.mock('../../../src/services/supabase');
jest.mock('../../../src/services/activityService');

const request = require('supertest');
const app = require('../../../src/index');
const { supabaseAdmin } = require('../../../src/services/supabase');
const { logActivity } = require('../../../src/services/activityService');

const USER_ID = '22222222-2222-4222-b222-222222222222';
const PROJECT_ID = '11111111-1111-4111-a111-111111111111';

const mockProfile = {
  id: USER_ID,
  email: 'user@example.com',
  full_name: 'Test User',
  role: 'member',
};

const mockProject = {
  id: PROJECT_ID,
  name: 'Test Project',
  description: 'A test project',
  status: 'active',
  created_by: USER_ID,
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
// GET /api/v1/projects
// ----------------------------------------------------------------
describe('GET /api/v1/projects', () => {
  it('returns 200 with projects list', async () => {
    setupMocks([
      { data: mockProfile, error: null },                  // auth middleware profile
      { data: [{ project_id: PROJECT_ID }], error: null }, // memberships
      { data: [mockProject], error: null },                // projects
    ]);

    const res = await request(app)
      .get('/api/v1/projects')
      .set('Authorization', 'Bearer mock-token');

    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty('data');
    expect(res.body).toHaveProperty('count');
  });

  it('returns 401 without token', async () => {
    const res = await request(app).get('/api/v1/projects');
    expect(res.status).toBe(401);
  });
});

// ----------------------------------------------------------------
// POST /api/v1/projects
// ----------------------------------------------------------------
describe('POST /api/v1/projects', () => {
  it('returns 201 on successful creation', async () => {
    setupMocks([
      { data: mockProfile, error: null }, // auth middleware
      { data: mockProject, error: null }, // project insert
      { data: {}, error: null },          // member insert
    ]);

    const res = await request(app)
      .post('/api/v1/projects')
      .set('Authorization', 'Bearer mock-token')
      .send({ name: 'Test Project' });

    expect(res.status).toBe(201);
    expect(res.body.data.name).toBe('Test Project');
  });

  it('returns 400 when name is missing', async () => {
    setupMocks([{ data: mockProfile, error: null }]);

    const res = await request(app)
      .post('/api/v1/projects')
      .set('Authorization', 'Bearer mock-token')
      .send({});

    expect(res.status).toBe(400);
  });

  it('returns 400 for invalid status', async () => {
    setupMocks([{ data: mockProfile, error: null }]);

    const res = await request(app)
      .post('/api/v1/projects')
      .set('Authorization', 'Bearer mock-token')
      .send({ name: 'Test', status: 'invalid-status' });

    expect(res.status).toBe(400);
  });

  it('returns 400 for invalid start_date format', async () => {
    setupMocks([{ data: mockProfile, error: null }]);

    const res = await request(app)
      .post('/api/v1/projects')
      .set('Authorization', 'Bearer mock-token')
      .send({ name: 'Test', start_date: 'not-a-date' });

    expect(res.status).toBe(400);
  });
});

// ----------------------------------------------------------------
// GET /api/v1/projects/:id
// ----------------------------------------------------------------
describe('GET /api/v1/projects/:id', () => {
  it('returns 200 with project', async () => {
    setupMocks([
      { data: mockProfile, error: null },           // auth middleware
      { data: { role: 'developer' }, error: null }, // membership check
      { data: mockProject, error: null },           // project fetch
    ]);

    const res = await request(app)
      .get(`/api/v1/projects/${PROJECT_ID}`)
      .set('Authorization', 'Bearer mock-token');

    expect(res.status).toBe(200);
    expect(res.body.data.id).toBe(PROJECT_ID);
  });

  it('returns 404 when user is not a member', async () => {
    setupMocks([
      { data: mockProfile, error: null },
      { data: null, error: null },
    ]);

    const res = await request(app)
      .get(`/api/v1/projects/${PROJECT_ID}`)
      .set('Authorization', 'Bearer mock-token');

    expect(res.status).toBe(404);
  });

  it('returns 400 for invalid UUID', async () => {
    setupMocks([{ data: mockProfile, error: null }]);

    const res = await request(app)
      .get('/api/v1/projects/not-a-uuid')
      .set('Authorization', 'Bearer mock-token');

    expect(res.status).toBe(400);
  });
});

// ----------------------------------------------------------------
// PUT /api/v1/projects/:id
// ----------------------------------------------------------------
describe('PUT /api/v1/projects/:id', () => {
  it('returns 200 on successful update', async () => {
    const updated = { ...mockProject, name: 'Updated' };
    setupMocks([
      { data: mockProfile, error: null },
      { data: { role: 'developer' }, error: null },
      { data: updated, error: null },
    ]);

    const res = await request(app)
      .put(`/api/v1/projects/${PROJECT_ID}`)
      .set('Authorization', 'Bearer mock-token')
      .send({ name: 'Updated' });

    expect(res.status).toBe(200);
    expect(res.body.data.name).toBe('Updated');
  });

  it('returns 403 when user is a viewer', async () => {
    setupMocks([
      { data: mockProfile, error: null },
      { data: { role: 'viewer' }, error: null },
    ]);

    const res = await request(app)
      .put(`/api/v1/projects/${PROJECT_ID}`)
      .set('Authorization', 'Bearer mock-token')
      .send({ name: 'Updated' });

    expect(res.status).toBe(403);
  });
});

// ----------------------------------------------------------------
// DELETE /api/v1/projects/:id
// ----------------------------------------------------------------
describe('DELETE /api/v1/projects/:id', () => {
  it('returns 204 when manager deletes project', async () => {
    setupMocks([
      { data: mockProfile, error: null },
      { data: { role: 'manager' }, error: null },
      { data: null, error: null },
    ]);

    const res = await request(app)
      .delete(`/api/v1/projects/${PROJECT_ID}`)
      .set('Authorization', 'Bearer mock-token');

    expect(res.status).toBe(204);
  });

  it('returns 403 when developer tries to delete', async () => {
    setupMocks([
      { data: mockProfile, error: null },
      { data: { role: 'developer' }, error: null },
    ]);

    const res = await request(app)
      .delete(`/api/v1/projects/${PROJECT_ID}`)
      .set('Authorization', 'Bearer mock-token');

    expect(res.status).toBe(403);
  });
});
