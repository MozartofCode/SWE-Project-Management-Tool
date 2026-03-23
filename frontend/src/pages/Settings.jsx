import { useState, useEffect } from 'react';
import { anthropicKeyApi } from '../services/api';

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
  return (
    <div className="max-w-3xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-900">Claude Connect</h1>
        <p className="text-slate-500 mt-1">Connect your account to Claude and manage your integrations.</p>
      </div>
      <AnthropicKeyCard />
    </div>
  );
}
