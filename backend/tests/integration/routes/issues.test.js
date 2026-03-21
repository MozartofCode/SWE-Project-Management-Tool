jest.mock('../../../src/services/supabase');
jest.mock('../../../src/services/activityService');

const request = require('supertest');
const app = require('../../../src/index');
const { supabaseAdmin } = require('../../../src/services/supabase');
const { logActivity } = require('../../../src/services/activityService');

const USER_ID = '22222222-2222-4222-b222-222222222222';
const PROJECT_ID = '11111111-1111-4111-a111-111111111111';
const ISSUE_ID = '55555555-5555-4555-a555-555555555555';

const mockProfile = {
  id: USER_ID,
  email: 'user@example.com',
  full_name: 'Test User',
  role: 'member',
};

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
// GET /api/v1/projects/:id/issues
// ----------------------------------------------------------------
describe('GET /api/v1/projects/:id/issues', () => {
  it('returns 200 with issues list', async () => {
    setupMocks([
      { data: mockProfile, error: null },
      { data: { role: 'developer' }, error: null },
      { data: [mockIssue], error: null },
    ]);

    const res = await request(app)
      .get(`/api/v1/projects/${PROJECT_ID}/issues`)
      .set('Authorization', 'Bearer mock-token');

    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty('data');
  });

  it('returns 400 for invalid status filter', async () => {
    setupMocks([{ data: mockProfile, error: null }]);

    const res = await request(app)
      .get(`/api/v1/projects/${PROJECT_ID}/issues?status=invalid`)
      .set('Authorization', 'Bearer mock-token');

    expect(res.status).toBe(400);
  });

  it('returns 400 for invalid priority filter', async () => {
    setupMocks([{ data: mockProfile, error: null }]);

    const res = await request(app)
      .get(`/api/v1/projects/${PROJECT_ID}/issues?priority=extreme`)
      .set('Authorization', 'Bearer mock-token');

    expect(res.status).toBe(400);
  });

  it('returns 400 for invalid assignee_id filter', async () => {
    setupMocks([{ data: mockProfile, error: null }]);

    const res = await request(app)
      .get(`/api/v1/projects/${PROJECT_ID}/issues?assignee_id=not-a-uuid`)
      .set('Authorization', 'Bearer mock-token');

    expect(res.status).toBe(400);
  });
});

// ----------------------------------------------------------------
// POST /api/v1/projects/:id/issues
// ----------------------------------------------------------------
describe('POST /api/v1/projects/:id/issues', () => {
  it('returns 201 on successful creation', async () => {
    setupMocks([
      { data: mockProfile, error: null },
      { data: { role: 'developer' }, error: null },
      { data: mockIssue, error: null },
    ]);

    const res = await request(app)
      .post(`/api/v1/projects/${PROJECT_ID}/issues`)
      .set('Authorization', 'Bearer mock-token')
      .send({ title: 'Test Issue', priority: 'medium' });

    expect(res.status).toBe(201);
    expect(res.body.data.title).toBe('Test Issue');
  });

  it('returns 400 when title is missing', async () => {
    setupMocks([{ data: mockProfile, error: null }]);

    const res = await request(app)
      .post(`/api/v1/projects/${PROJECT_ID}/issues`)
      .set('Authorization', 'Bearer mock-token')
      .send({ priority: 'high' });

    expect(res.status).toBe(400);
  });

  it('returns 400 for invalid priority', async () => {
    setupMocks([{ data: mockProfile, error: null }]);

    const res = await request(app)
      .post(`/api/v1/projects/${PROJECT_ID}/issues`)
      .set('Authorization', 'Bearer mock-token')
      .send({ title: 'Test', priority: 'extreme' });

    expect(res.status).toBe(400);
  });

  it('returns 400 for invalid due_date format', async () => {
    setupMocks([{ data: mockProfile, error: null }]);

    const res = await request(app)
      .post(`/api/v1/projects/${PROJECT_ID}/issues`)
      .set('Authorization', 'Bearer mock-token')
      .send({ title: 'Test', due_date: 'not-a-date' });

    expect(res.status).toBe(400);
  });

  it('returns 400 for invalid assignee_id', async () => {
    setupMocks([{ data: mockProfile, error: null }]);

    const res = await request(app)
      .post(`/api/v1/projects/${PROJECT_ID}/issues`)
      .set('Authorization', 'Bearer mock-token')
      .send({ title: 'Test', assignee_id: 'not-a-uuid' });

    expect(res.status).toBe(400);
  });
});

// ----------------------------------------------------------------
// GET /api/v1/projects/:id/issues/:issueId
// ----------------------------------------------------------------
describe('GET /api/v1/projects/:id/issues/:issueId', () => {
  it('returns 200 with the issue', async () => {
    setupMocks([
      { data: mockProfile, error: null },
      { data: { role: 'developer' }, error: null },
      { data: mockIssue, error: null },
    ]);

    const res = await request(app)
      .get(`/api/v1/projects/${PROJECT_ID}/issues/${ISSUE_ID}`)
      .set('Authorization', 'Bearer mock-token');

    expect(res.status).toBe(200);
    expect(res.body.data.id).toBe(ISSUE_ID);
  });

  it('returns 404 when issue does not exist', async () => {
    setupMocks([
      { data: mockProfile, error: null },
      { data: { role: 'developer' }, error: null },
      { data: null, error: null },
    ]);

    const res = await request(app)
      .get(`/api/v1/projects/${PROJECT_ID}/issues/${ISSUE_ID}`)
      .set('Authorization', 'Bearer mock-token');

    expect(res.status).toBe(404);
  });

  it('returns 400 for invalid issueId UUID', async () => {
    setupMocks([{ data: mockProfile, error: null }]);

    const res = await request(app)
      .get(`/api/v1/projects/${PROJECT_ID}/issues/not-a-uuid`)
      .set('Authorization', 'Bearer mock-token');

    expect(res.status).toBe(400);
  });
});

// ----------------------------------------------------------------
// PUT /api/v1/projects/:id/issues/:issueId
// ----------------------------------------------------------------
describe('PUT /api/v1/projects/:id/issues/:issueId', () => {
  it('returns 200 when closing an issue', async () => {
    const closed = { ...mockIssue, status: 'closed', closed_at: '2026-01-02T00:00:00Z' };
    setupMocks([
      { data: mockProfile, error: null },
      { data: { role: 'developer' }, error: null },
      { data: mockIssue, error: null },
      { data: closed, error: null },
    ]);

    const res = await request(app)
      .put(`/api/v1/projects/${PROJECT_ID}/issues/${ISSUE_ID}`)
      .set('Authorization', 'Bearer mock-token')
      .send({ status: 'closed' });

    expect(res.status).toBe(200);
    expect(res.body.data.status).toBe('closed');
  });

  it('returns 400 for invalid status value', async () => {
    setupMocks([{ data: mockProfile, error: null }]);

    const res = await request(app)
      .put(`/api/v1/projects/${PROJECT_ID}/issues/${ISSUE_ID}`)
      .set('Authorization', 'Bearer mock-token')
      .send({ status: 'invalid' });

    expect(res.status).toBe(400);
  });

  it('returns 400 for invalid issueId UUID', async () => {
    setupMocks([{ data: mockProfile, error: null }]);

    const res = await request(app)
      .put(`/api/v1/projects/${PROJECT_ID}/issues/not-a-uuid`)
      .set('Authorization', 'Bearer mock-token')
      .send({ status: 'closed' });

    expect(res.status).toBe(400);
  });
});

// ----------------------------------------------------------------
// DELETE /api/v1/projects/:id/issues/:issueId
// ----------------------------------------------------------------
describe('DELETE /api/v1/projects/:id/issues/:issueId', () => {
  it('returns 204 on successful delete', async () => {
    setupMocks([
      { data: mockProfile, error: null },
      { data: { role: 'developer' }, error: null },
      { data: null, error: null },
    ]);

    const res = await request(app)
      .delete(`/api/v1/projects/${PROJECT_ID}/issues/${ISSUE_ID}`)
      .set('Authorization', 'Bearer mock-token');

    expect(res.status).toBe(204);
  });

  it('returns 400 for invalid issueId UUID', async () => {
    setupMocks([{ data: mockProfile, error: null }]);

    const res = await request(app)
      .delete(`/api/v1/projects/${PROJECT_ID}/issues/not-a-uuid`)
      .set('Authorization', 'Bearer mock-token');

    expect(res.status).toBe(400);
  });
});
