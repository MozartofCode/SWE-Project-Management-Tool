import { useState, useEffect, useCallback } from 'react';
import { apiKeysApi, anthropicKeyApi } from '../services/api';
import { formatDate } from '../services/utils';

function CopyButton({ text }) {
  const [copied, setCopied] = useState(false);

  const copy = async () => {
    await navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <button
      onClick={copy}
      className="ml-2 px-2 py-1 text-xs rounded bg-slate-700 hover:bg-slate-600 text-white transition-colors"
    >
      {copied ? 'Copied!' : 'Copy'}
    </button>
  );
}

function NewKeyModal({ onClose, onCreated }) {
  const [name, setName] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [createdKey, setCreatedKey] = useState(null);

  const submit = async (e) => {
    e.preventDefault();
    if (!name.trim()) return;
    setLoading(true);
    setError('');
    try {
      const res = await apiKeysApi.create(name.trim());
      setCreatedKey(res.data.data);
      onCreated();
    } catch (err) {
      setError(err.response?.data?.error?.message || 'Failed to create key');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl shadow-xl w-full max-w-lg">
        <div className="p-6 border-b border-slate-200">
          <h2 className="text-lg font-semibold text-slate-900">
            {createdKey ? 'API Key Created' : 'New API Key'}
          </h2>
        </div>

        <div className="p-6">
          {createdKey ? (
            <div className="space-y-4">
              <div className="flex items-start gap-3 p-4 bg-amber-50 border border-amber-200 rounded-lg">
                <svg className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126zM12 15.75h.007v.008H12v-.008z" />
                </svg>
                <p className="text-sm text-amber-800">
                  <strong>Copy this key now.</strong> It will never be shown again. Store it somewhere safe.
                </p>
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Your API Key</label>
                <div className="flex items-center gap-2 p-3 bg-slate-900 rounded-lg font-mono text-sm text-green-400 break-all">
                  <span className="flex-1 select-all">{createdKey.key}</span>
                  <CopyButton text={createdKey.key} />
                </div>
              </div>

              <div className="text-sm text-slate-600 space-y-1">
                <p><span className="font-medium">Name:</span> {createdKey.name}</p>
                <p><span className="font-medium">Prefix:</span> {createdKey.key_prefix}…</p>
              </div>

              <div className="p-4 bg-slate-50 rounded-lg border border-slate-200">
                <p className="text-sm font-medium text-slate-700 mb-2">Add to Claude Code settings:</p>
                <pre className="text-xs text-slate-600 overflow-x-auto whitespace-pre-wrap">
{`{
  "mcpServers": {
    "projectflow": {
      "command": "npx",
      "args": ["projectflow-mcp"],
      "env": {
        "PROJECTFLOW_URL": "${window.location.origin.replace('5173','3001').replace('5174','3001')}/api/v1",
        "PROJECTFLOW_API_KEY": "${createdKey.key}"
      }
    }
  }
}`}
                </pre>
                <CopyButton text={JSON.stringify({
                  mcpServers: {
                    projectflow: {
                      command: 'npx',
                      args: ['projectflow-mcp'],
                      env: {
                        PROJECTFLOW_URL: `${window.location.origin.replace('5173','3001').replace('5174','3001')}/api/v1`,
                        PROJECTFLOW_API_KEY: createdKey.key,
                      }
                    }
                  }
                }, null, 2)} />
              </div>
            </div>
          ) : (
            <form onSubmit={submit} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">
                  Key Name
                </label>
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="e.g. My Claude Code"
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  autoFocus
                  maxLength={100}
                />
                <p className="mt-1 text-xs text-slate-500">Give this key a memorable name so you know where it's used.</p>
              </div>
              {error && <p className="text-sm text-red-600">{error}</p>}
              <div className="flex justify-end gap-3">
                <button type="button" onClick={onClose} className="px-4 py-2 text-sm text-slate-600 hover:text-slate-800">
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={loading || !name.trim()}
                  className="px-4 py-2 text-sm bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 disabled:opacity-50 transition-colors"
                >
                  {loading ? 'Generating…' : 'Generate Key'}
                </button>
              </div>
            </form>
          )}
        </div>

        {createdKey && (
          <div className="px-6 pb-6 flex justify-end">
            <button
              onClick={onClose}
              className="px-4 py-2 text-sm bg-slate-900 text-white rounded-lg hover:bg-slate-700 transition-colors"
            >
              Done
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

function AnthropicKeyCard() {
  const [hasKey, setHasKey] = useState(false);
  const [keyInput, setKeyInput] = useState('');
  const [saving, setSaving] = useState(false);
  const [status, setStatus] = useState('');

  useEffect(() => {
    anthropicKeyApi.getStatus()
      .then((res) => setHasKey(res.data.data.has_anthropic_key))
      .catch(() => {});
  }, []);

  const save = async (e) => {
    e.preventDefault();
    if (!keyInput.trim()) return;
    setSaving(true);
    setStatus('');
    try {
      await anthropicKeyApi.save(keyInput.trim());
      setHasKey(true);
      setKeyInput('');
      setStatus('saved');
    } catch {
      setStatus('error');
    } finally {
      setSaving(false);
    }
  };

  const clear = async () => {
    if (!window.confirm('Remove your Anthropic API key? AI Export buttons will be hidden until you add one again.')) return;
    try {
      await anthropicKeyApi.clear();
      setHasKey(false);
      setStatus('');
    } catch {
      setStatus('error');
    }
  };

  return (
    <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
      {/* Gradient header */}
      <div className="p-6 border-b border-slate-200" style={{ background: 'linear-gradient(135deg, #6366f115, #8b5cf615, #06b6d415)' }}>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-lg flex items-center justify-center text-white text-lg font-bold shadow-sm" style={{ background: 'linear-gradient(135deg, #6366f1, #8b5cf6, #06b6d4)' }}>
              ✦
            </div>
            <div>
              <h2 className="text-base font-semibold text-slate-900">AI Export</h2>
              <p className="text-sm text-slate-500 mt-0.5">
                Add your Anthropic key to unlock Claude-powered .md exports on every project and issue.
              </p>
            </div>
          </div>
          {hasKey && (
            <span className="flex items-center gap-1.5 text-xs font-medium text-emerald-700 bg-emerald-100 px-2.5 py-1 rounded-full">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 inline-block" />
              Active
            </span>
          )}
        </div>
      </div>

      <div className="p-6 space-y-4">
        {hasKey ? (
          <div className="flex items-center justify-between p-4 bg-slate-50 rounded-lg border border-slate-200">
            <div>
              <p className="text-sm font-medium text-slate-800">Anthropic API key configured</p>
              <p className="text-xs text-slate-500 mt-0.5">Your key is stored securely and never shown again.</p>
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={() => { setHasKey(false); setKeyInput(''); }}
                className="text-xs text-indigo-600 hover:text-indigo-800 font-medium"
              >
                Replace
              </button>
              <span className="text-slate-300">|</span>
              <button onClick={clear} className="text-xs text-red-500 hover:text-red-700 font-medium">
                Remove
              </button>
            </div>
          </div>
        ) : (
          <form onSubmit={save} className="space-y-3">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Anthropic API Key</label>
              <input
                type="password"
                value={keyInput}
                onChange={(e) => setKeyInput(e.target.value)}
                placeholder="sk-ant-api03-..."
                className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm font-mono focus:outline-none focus:ring-2 focus:ring-violet-500"
                autoComplete="off"
              />
              <p className="mt-1 text-xs text-slate-400">
                Get your key from <span className="font-medium">console.anthropic.com</span>. It's stored per-account and never exposed.
              </p>
            </div>
            {status === 'error' && <p className="text-xs text-red-600">Failed to save. Please try again.</p>}
            {status === 'saved' && <p className="text-xs text-emerald-600">Key saved! AI Export buttons are now active on all projects and issues.</p>}
            <button
              type="submit"
              disabled={saving || !keyInput.trim()}
              className="px-4 py-2 text-sm font-semibold text-white rounded-lg transition-all disabled:opacity-50 shadow-sm"
              style={{ background: 'linear-gradient(135deg, #6366f1, #8b5cf6, #06b6d4)' }}
            >
              {saving ? 'Saving…' : '✦ Save Key & Enable AI Export'}
            </button>
          </form>
        )}
      </div>
    </div>
  );
}

export default function Settings() {
  const [keys, setKeys] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [revoking, setRevoking] = useState(null);

  const loadKeys = useCallback(async () => {
    try {
      const res = await apiKeysApi.list();
      setKeys(res.data.data);
    } catch (err) {
      setError('Failed to load API keys');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { loadKeys(); }, [loadKeys]);

  const revoke = async (key) => {
    if (!window.confirm(`Revoke "${key.name}"? Any integrations using it will stop working immediately.`)) return;
    setRevoking(key.id);
    try {
      await apiKeysApi.revoke(key.id);
      setKeys((prev) => prev.filter((k) => k.id !== key.id));
    } catch (err) {
      setError('Failed to revoke key');
    } finally {
      setRevoking(null);
    }
  };

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-slate-900">Settings</h1>
        <p className="text-slate-500 mt-1">Manage your account and integrations.</p>
      </div>

      {/* API Keys card */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-sm">
        <div className="p-6 border-b border-slate-200 flex items-center justify-between">
          <div>
            <h2 className="text-base font-semibold text-slate-900">API Keys</h2>
            <p className="text-sm text-slate-500 mt-0.5">
              Use these keys to connect Claude Code (MCP) and other integrations to your account.
            </p>
          </div>
          <button
            onClick={() => setShowModal(true)}
            className="flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white text-sm font-medium rounded-lg hover:bg-indigo-700 transition-colors"
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
            </svg>
            New Key
          </button>
        </div>

        <div className="divide-y divide-slate-100">
          {loading && (
            <div className="p-6 space-y-3">
              {[1, 2].map((i) => (
                <div key={i} className="h-10 bg-slate-100 rounded animate-pulse" />
              ))}
            </div>
          )}

          {!loading && error && (
            <div className="p-6 text-sm text-red-600">{error}</div>
          )}

          {!loading && !error && keys.length === 0 && (
            <div className="p-12 text-center">
              <svg className="w-10 h-10 text-slate-300 mx-auto mb-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 5.25a3 3 0 013 3m3 0a6 6 0 01-7.029 5.912c-.563-.097-1.159.026-1.563.43L10.5 17.25H8.25v2.25H6v2.25H2.25v-2.818c0-.597.237-1.17.659-1.591l6.499-6.499c.404-.404.527-1 .43-1.563A6 6 0 1121.75 8.25z" />
              </svg>
              <p className="text-sm font-medium text-slate-500">No API keys yet</p>
              <p className="text-xs text-slate-400 mt-1">Generate a key to connect Claude Code MCP.</p>
            </div>
          )}

          {!loading && keys.map((key) => (
            <div key={key.id} className="flex items-center justify-between px-6 py-4">
              <div className="min-w-0">
                <p className="text-sm font-medium text-slate-900">{key.name}</p>
                <div className="flex items-center gap-3 mt-0.5">
                  <span className="text-xs font-mono text-slate-400">{key.key_prefix}••••••••••••••••••••</span>
                  <span className="text-xs text-slate-400">
                    Created {formatDate(key.created_at)}
                  </span>
                  {key.last_used_at && (
                    <span className="text-xs text-slate-400">
                      Last used {formatDate(key.last_used_at)}
                    </span>
                  )}
                  {!key.last_used_at && (
                    <span className="text-xs text-slate-300 italic">Never used</span>
                  )}
                </div>
              </div>
              <button
                onClick={() => revoke(key)}
                disabled={revoking === key.id}
                className="ml-4 px-3 py-1.5 text-xs font-medium text-red-600 border border-red-200 rounded-lg hover:bg-red-50 disabled:opacity-50 transition-colors shrink-0"
              >
                {revoking === key.id ? 'Revoking…' : 'Revoke'}
              </button>
            </div>
          ))}
        </div>
      </div>

      {/* AI Export — Anthropic key */}
      <AnthropicKeyCard />

      {/* MCP setup guide */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-6">
        <h2 className="text-base font-semibold text-slate-900 mb-1">Claude Code MCP Setup</h2>
        <p className="text-sm text-slate-500 mb-4">
          Connect ProjectFlow to Claude Code so you can manage projects and issues directly from your terminal.
        </p>
        <ol className="space-y-3 text-sm text-slate-700">
          <li className="flex gap-3">
            <span className="flex-shrink-0 w-6 h-6 rounded-full bg-indigo-100 text-indigo-700 flex items-center justify-center text-xs font-bold">1</span>
            <span>Generate an API key above and copy it.</span>
          </li>
          <li className="flex gap-3">
            <span className="flex-shrink-0 w-6 h-6 rounded-full bg-indigo-100 text-indigo-700 flex items-center justify-center text-xs font-bold">2</span>
            <div>
              <span>Add the MCP server to your Claude Code settings with:</span>
              <pre className="mt-2 p-3 bg-slate-900 text-green-400 rounded-lg text-xs overflow-x-auto">
                claude mcp add projectflow
              </pre>
            </div>
          </li>
          <li className="flex gap-3">
            <span className="flex-shrink-0 w-6 h-6 rounded-full bg-indigo-100 text-indigo-700 flex items-center justify-center text-xs font-bold">3</span>
            <span>When prompted, enter the API key from step 1.</span>
          </li>
          <li className="flex gap-3">
            <span className="flex-shrink-0 w-6 h-6 rounded-full bg-indigo-100 text-indigo-700 flex items-center justify-center text-xs font-bold">4</span>
            <span>Ask Claude: <em>"List my ProjectFlow projects"</em> to verify it works.</span>
          </li>
        </ol>
      </div>

      {showModal && (
        <NewKeyModal
          onClose={() => { setShowModal(false); }}
          onCreated={loadKeys}
        />
      )}
    </div>
  );
}
