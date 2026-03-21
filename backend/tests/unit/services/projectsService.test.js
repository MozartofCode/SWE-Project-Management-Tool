jest.mock('../../../src/services/supabase');
jest.mock('../../../src/services/activityService');

const { supabaseAdmin } = require('../../../src/services/supabase');
const { logActivity } = require('../../../src/services/activityService');
const projectsService = require('../../../src/services/projectsService');

const PROJECT_ID = '11111111-1111-4111-a111-111111111111';
const USER_ID = '22222222-2222-4222-b222-222222222222';

const mockProject = {
  id: PROJECT_ID,
  name: 'Test Project',
  description: 'A test project',
  status: 'active',
  created_by: USER_ID,
  created_at: '2026-01-01T00:00:00Z',
  updated_at: '2026-01-01T00:00:00Z',
};

/**
 * Creates a thenable Supabase query chain mock.
 * Awaiting the chain directly OR calling .single()/.order()/.limit()
 * all resolve to the given `res`.
 */
const makeChain = (res) => {
  const chain = {
    select: jest.fn().mockReturnThis(),
    eq: jest.fn().mockReturnThis(),
    neq: jest.fn().mockReturnThis(),
    in: jest.fn().mockReturnThis(),
    insert: jest.fn().mockReturnThis(),
    update: jest.fn().mockReturnThis(),
    delete: jest.fn().mockReturnThis(),
    order: jest.fn().mockReturnThis(),
    limit: jest.fn().mockReturnThis(),
    single: jest.fn().mockResolvedValue(res),
    // Thenable so `await chain` resolves to `res`
    then(resolve, reject) {
      return Promise.resolve(res).then(resolve, reject);
    },
    catch(reject) {
      return Promise.resolve(res).catch(reject);
    },
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
// listProjects
// ----------------------------------------------------------------
describe('projectsService.listProjects', () => {
  it('returns projects the user is a member of', async () => {
    supabaseAdmin.from = makeFrom([
      { data: [{ project_id: PROJECT_ID }], error: null }, // project_members
      { data: [mockProject], error: null },                // projects
    ]);

    const result = await projectsService.listProjects(USER_ID);
    expect(result).toEqual([mockProject]);
  });

  it('returns empty array when user has no memberships', async () => {
    supabaseAdmin.from = makeFrom([
      { data: [], error: null },
    ]);

    const result = await projectsService.listProjects(USER_ID);
    expect(result).toEqual([]);
  });

  it('throws on Supabase error fetching memberships', async () => {
    supabaseAdmin.from = makeFrom([
      { data: null, error: { message: 'DB error' } },
    ]);

    await expect(projectsService.listProjects(USER_ID)).rejects.toMatchObject({
      message: 'DB error',
    });
  });
});

// ----------------------------------------------------------------
// createProject
// ----------------------------------------------------------------
describe('projectsService.createProject', () => {
  it('creates a project, adds creator as manager, logs activity', async () => {
    supabaseAdmin.from = makeFrom([
      { data: mockProject, error: null }, // projects insert
      { data: {}, error: null },          // project_members insert
    ]);

    const result = await projectsService.createProject(USER_ID, {
      name: 'Test Project',
      description: 'A test project',
    });

    expect(result).toEqual(mockProject);
    expect(logActivity).toHaveBeenCalledWith(
      expect.objectContaining({ action: 'created_project' })
    );
  });
});

// ----------------------------------------------------------------
// getProjectById
// ----------------------------------------------------------------
describe('projectsService.getProjectById', () => {
  it('returns the project when user is a member', async () => {
    supabaseAdmin.from = makeFrom([
      { data: { role: 'developer' }, error: null }, // membership check
      { data: mockProject, error: null },           // project fetch
    ]);

    const result = await projectsService.getProjectById(PROJECT_ID, USER_ID);
    expect(result).toEqual(mockProject);
  });

  it('throws 404 when user is not a member', async () => {
    supabaseAdmin.from = makeFrom([
      { data: null, error: null },
    ]);

    await expect(
      projectsService.getProjectById(PROJECT_ID, USER_ID)
    ).rejects.toMatchObject({ status: 404, code: 'NOT_FOUND' });
  });
});

// ----------------------------------------------------------------
// updateProject
// ----------------------------------------------------------------
describe('projectsService.updateProject', () => {
  it('updates project when user is developer or above', async () => {
    const updated = { ...mockProject, name: 'Updated Name' };
    supabaseAdmin.from = makeFrom([
      { data: { role: 'developer' }, error: null },
      { data: updated, error: null },
    ]);

    const result = await projectsService.updateProject(PROJECT_ID, USER_ID, {
      name: 'Updated Name',
    });

    expect(result.name).toBe('Updated Name');
    expect(logActivity).toHaveBeenCalledWith(
      expect.objectContaining({ action: 'updated_project' })
    );
  });

  it('throws 403 when user is a viewer', async () => {
    supabaseAdmin.from = makeFrom([
      { data: { role: 'viewer' }, error: null },
    ]);

    await expect(
      projectsService.updateProject(PROJECT_ID, USER_ID, { name: 'Blocked' })
    ).rejects.toMatchObject({ status: 403, code: 'FORBIDDEN' });
  });

  it('throws 404 when project not found', async () => {
    supabaseAdmin.from = makeFrom([
      { data: null, error: null },
    ]);

    await expect(
      projectsService.updateProject(PROJECT_ID, USER_ID, { name: 'X' })
    ).rejects.toMatchObject({ status: 404, code: 'NOT_FOUND' });
  });
});

// ----------------------------------------------------------------
// deleteProject
// ----------------------------------------------------------------
describe('projectsService.deleteProject', () => {
  it('deletes when user is manager', async () => {
    supabaseAdmin.from = makeFrom([
      { data: { role: 'manager' }, error: null },
      { data: null, error: null },
    ]);

    await expect(
      projectsService.deleteProject(PROJECT_ID, USER_ID, 'member')
    ).resolves.toBeUndefined();
  });

  it('deletes when user is admin regardless of project role', async () => {
    supabaseAdmin.from = makeFrom([
      { data: { role: 'viewer' }, error: null },
      { data: null, error: null },
    ]);

    await expect(
      projectsService.deleteProject(PROJECT_ID, USER_ID, 'admin')
    ).resolves.toBeUndefined();
  });

  it('throws 403 when developer tries to delete', async () => {
    supabaseAdmin.from = makeFrom([
      { data: { role: 'developer' }, error: null },
    ]);

    await expect(
      projectsService.deleteProject(PROJECT_ID, USER_ID, 'member')
    ).rejects.toMatchObject({ status: 403, code: 'FORBIDDEN' });
  });

  it('throws 404 when project not found', async () => {
    supabaseAdmin.from = makeFrom([
      { data: null, error: null },
    ]);

    await expect(
      projectsService.deleteProject(PROJECT_ID, USER_ID, 'member')
    ).rejects.toMatchObject({ status: 404, code: 'NOT_FOUND' });
  });
});
