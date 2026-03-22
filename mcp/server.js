#!/usr/bin/env node
import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
} from '@modelcontextprotocol/sdk/types.js';
import axios from 'axios';

const BASE_URL = process.env.PROJECTFLOW_URL;
const API_KEY = process.env.PROJECTFLOW_API_KEY;

if (!BASE_URL || !API_KEY) {
  console.error(
    'Error: PROJECTFLOW_URL and PROJECTFLOW_API_KEY environment variables are required.\n' +
    'Add them to your Claude Code MCP settings:\n' +
    '  PROJECTFLOW_URL=http://localhost:3001/api/v1\n' +
    '  PROJECTFLOW_API_KEY=pfk_...'
  );
  process.exit(1);
}

const http = axios.create({
  baseURL: BASE_URL,
  headers: {
    Authorization: `Bearer ${API_KEY}`,
    'Content-Type': 'application/json',
  },
  timeout: 15000,
});

// Helper: convert axios errors to readable strings
function apiError(err) {
  const msg = err.response?.data?.error?.message || err.message || 'Unknown error';
  const status = err.response?.status;
  return status ? `HTTP ${status}: ${msg}` : msg;
}

// ─── Tool definitions ────────────────────────────────────────────────────────

const TOOLS = [
  {
    name: 'list_projects',
    description: 'List all ProjectFlow projects the authenticated user has access to.',
    inputSchema: {
      type: 'object',
      properties: {
        status: {
          type: 'string',
          enum: ['active', 'on_hold', 'completed', 'archived'],
          description: 'Filter by project status (optional)',
        },
      },
    },
  },
  {
    name: 'get_project',
    description: 'Get full details of a specific project including its members.',
    inputSchema: {
      type: 'object',
      properties: {
        project_id: { type: 'string', description: 'UUID of the project' },
      },
      required: ['project_id'],
    },
  },
  {
    name: 'create_project',
    description: 'Create a new project.',
    inputSchema: {
      type: 'object',
      properties: {
        name: { type: 'string', description: 'Project name' },
        description: { type: 'string', description: 'Project description (optional)' },
        status: {
          type: 'string',
          enum: ['active', 'on_hold', 'completed', 'archived'],
          description: 'Initial status (default: active)',
        },
      },
      required: ['name'],
    },
  },
  {
    name: 'list_issues',
    description: 'List issues in a project with optional filters.',
    inputSchema: {
      type: 'object',
      properties: {
        project_id: { type: 'string', description: 'UUID of the project' },
        status: {
          type: 'string',
          enum: ['open', 'in_progress', 'resolved', 'closed'],
          description: 'Filter by issue status',
        },
        priority: {
          type: 'string',
          enum: ['low', 'medium', 'high', 'critical'],
          description: 'Filter by priority',
        },
      },
      required: ['project_id'],
    },
  },
  {
    name: 'get_issue',
    description: 'Get full details of a specific issue.',
    inputSchema: {
      type: 'object',
      properties: {
        project_id: { type: 'string', description: 'UUID of the project' },
        issue_id: { type: 'string', description: 'UUID of the issue' },
      },
      required: ['project_id', 'issue_id'],
    },
  },
  {
    name: 'create_issue',
    description: 'Create a new issue in a project.',
    inputSchema: {
      type: 'object',
      properties: {
        project_id: { type: 'string', description: 'UUID of the project' },
        title: { type: 'string', description: 'Issue title' },
        description: { type: 'string', description: 'Detailed description (optional)' },
        priority: {
          type: 'string',
          enum: ['low', 'medium', 'high', 'critical'],
          description: 'Priority level (default: medium)',
        },
        assignee_id: { type: 'string', description: 'UUID of the user to assign (optional)' },
      },
      required: ['project_id', 'title'],
    },
  },
  {
    name: 'update_issue',
    description: 'Update an existing issue — change status, priority, assignee, title, or description.',
    inputSchema: {
      type: 'object',
      properties: {
        project_id: { type: 'string', description: 'UUID of the project' },
        issue_id: { type: 'string', description: 'UUID of the issue' },
        title: { type: 'string', description: 'New title (optional)' },
        description: { type: 'string', description: 'New description (optional)' },
        status: {
          type: 'string',
          enum: ['open', 'in_progress', 'resolved', 'closed'],
          description: 'New status (optional)',
        },
        priority: {
          type: 'string',
          enum: ['low', 'medium', 'high', 'critical'],
          description: 'New priority (optional)',
        },
        assignee_id: { type: 'string', description: 'UUID of new assignee (optional)' },
      },
      required: ['project_id', 'issue_id'],
    },
  },
  {
    name: 'list_activity',
    description: 'Get recent activity for a project.',
    inputSchema: {
      type: 'object',
      properties: {
        project_id: { type: 'string', description: 'UUID of the project' },
        limit: { type: 'number', description: 'Number of entries to return (default: 20, max: 50)' },
      },
      required: ['project_id'],
    },
  },
  {
    name: 'get_me',
    description: 'Get the currently authenticated user profile.',
    inputSchema: { type: 'object', properties: {} },
  },
];

// ─── Tool handlers ────────────────────────────────────────────────────────────

async function callTool(name, args) {
  switch (name) {
    case 'list_projects': {
      const params = args.status ? { status: args.status } : {};
      const { data } = await http.get('/projects', { params });
      return data.data;
    }

    case 'get_project': {
      const { data } = await http.get(`/projects/${args.project_id}`);
      return data.data;
    }

    case 'create_project': {
      const body = { name: args.name };
      if (args.description) body.description = args.description;
      if (args.status) body.status = args.status;
      const { data } = await http.post('/projects', body);
      return data.data;
    }

    case 'list_issues': {
      const params = {};
      if (args.status) params.status = args.status;
      if (args.priority) params.priority = args.priority;
      const { data } = await http.get(`/projects/${args.project_id}/issues`, { params });
      return data.data;
    }

    case 'get_issue': {
      const { data } = await http.get(`/projects/${args.project_id}/issues/${args.issue_id}`);
      return data.data;
    }

    case 'create_issue': {
      const body = { title: args.title };
      if (args.description) body.description = args.description;
      if (args.priority) body.priority = args.priority;
      if (args.assignee_id) body.assignee_id = args.assignee_id;
      const { data } = await http.post(`/projects/${args.project_id}/issues`, body);
      return data.data;
    }

    case 'update_issue': {
      const body = {};
      const fields = ['title', 'description', 'status', 'priority', 'assignee_id'];
      for (const f of fields) {
        if (args[f] !== undefined) body[f] = args[f];
      }
      const { data } = await http.put(
        `/projects/${args.project_id}/issues/${args.issue_id}`,
        body
      );
      return data.data;
    }

    case 'list_activity': {
      const params = { limit: Math.min(args.limit || 20, 50) };
      const { data } = await http.get(`/projects/${args.project_id}/activity`, { params });
      return data.data;
    }

    case 'get_me': {
      const { data } = await http.get('/auth/me');
      return data.data;
    }

    default:
      throw new Error(`Unknown tool: ${name}`);
  }
}

// ─── Server setup ─────────────────────────────────────────────────────────────

const server = new Server(
  { name: 'projectflow-mcp', version: '1.0.0' },
  { capabilities: { tools: {} } }
);

server.setRequestHandler(ListToolsRequestSchema, async () => ({ tools: TOOLS }));

server.setRequestHandler(CallToolRequestSchema, async (request) => {
  const { name, arguments: args } = request.params;
  try {
    const result = await callTool(name, args || {});
    return {
      content: [{ type: 'text', text: JSON.stringify(result, null, 2) }],
    };
  } catch (err) {
    return {
      content: [{ type: 'text', text: `Error: ${apiError(err)}` }],
      isError: true,
    };
  }
});

const transport = new StdioServerTransport();
await server.connect(transport);
