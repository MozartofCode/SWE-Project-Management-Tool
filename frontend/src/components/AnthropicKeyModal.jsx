import { useState, useEffect } from 'react';
import { anthropicKeyApi } from '../services/api';

export default function AnthropicKeyModal({ onClose, onSaved }) {
  const [hasKey, setHasKey] = useState(false);
  const [keyInput, setKeyInput] = useState('');
  const [saving, setSaving] = useState(false);
  const [status, setStatus] = useState('');

  useEffect(() => {
    anthropicKeyApi.getStatus()
      .then((res) => setHasKey(res.data.data.has_anthropic_key))
      .catch(() => {});
  }, []);

  // Close on Escape
  useEffect(() => {
    const handler = (e) => { if (e.key === 'Escape') onClose(); };
    document.addEventListener('keydown', handler);
    return () => document.removeEventListener('keydown', handler);
  }, [onClose]);

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
      onSaved?.();
    } catch {
      setStatus('error');
    } finally {
      setSaving(false);
    }
  };

  const clear = async () => {
    if (!window.confirm('Remove your Anthropic API key? AI Export buttons will stop working until you add one again.')) return;
    try {
      await anthropicKeyApi.clear();
      setHasKey(false);
      setStatus('');
      onSaved?.();
    } catch {
      setStatus('error');
    }
  };

  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4" onClick={onClose}>
      <div
        className="bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Gradient header */}
        <div className="p-6" style={{ background: 'linear-gradient(135deg, #6366f1, #8b5cf6, #06b6d4)' }}>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <span className="text-2xl">✦</span>
              <div>
                <h2 className="text-lg font-bold text-white">Claude Connect</h2>
                <p className="text-sm text-white/75">AI-powered export settings</p>
              </div>
            </div>
            <button onClick={onClose} className="text-white/70 hover:text-white transition-colors">
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        </div>

        <div className="p-6 space-y-4">
          {hasKey ? (
            <>
              <div className="flex items-center gap-3 p-4 bg-emerald-50 border border-emerald-200 rounded-xl">
                <span className="w-2 h-2 rounded-full bg-emerald-500 shrink-0" />
                <div className="flex-1">
                  <p className="text-sm font-medium text-emerald-800">API key active</p>
                  <p className="text-xs text-emerald-600 mt-0.5">AI Export is enabled on all projects and issues.</p>
                </div>
              </div>
              <div className="flex gap-2">
                <button
                  onClick={() => { setHasKey(false); setKeyInput(''); }}
                  className="flex-1 px-4 py-2 text-sm font-medium text-slate-700 border border-slate-300 rounded-lg hover:bg-slate-50 transition-colors"
                >
                  Replace key
                </button>
                <button
                  onClick={clear}
                  className="flex-1 px-4 py-2 text-sm font-medium text-red-600 border border-red-200 rounded-lg hover:bg-red-50 transition-colors"
                >
                  Remove key
                </button>
              </div>
              <button
                onClick={onClose}
                className="w-full px-4 py-2 text-sm font-semibold text-white rounded-lg transition-all"
                style={{ background: 'linear-gradient(135deg, #6366f1, #8b5cf6, #06b6d4)' }}
              >
                Done
              </button>
            </>
          ) : (
            <form onSubmit={save} className="space-y-4">
              <div>
                <p className="text-sm text-slate-600 mb-4">
                  Add your Anthropic API key to unlock <strong>✦ AI Export</strong> — Claude will turn your project data into a perfectly structured spec for Claude Code.
                </p>
                <label className="block text-sm font-medium text-slate-700 mb-1">Anthropic API Key</label>
                <input
                  type="password"
                  value={keyInput}
                  onChange={(e) => setKeyInput(e.target.value)}
                  placeholder="sk-ant-api03-..."
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm font-mono focus:outline-none focus:ring-2 focus:ring-violet-500"
                  autoComplete="off"
                  autoFocus
                />
                <p className="mt-1.5 text-xs text-slate-400">
                  Get your key at <span className="font-medium text-slate-500">console.anthropic.com</span>. Stored securely per account, never exposed.
                </p>
              </div>
              {status === 'error' && <p className="text-xs text-red-600">Failed to save. Please try again.</p>}
              {status === 'saved' && <p className="text-xs text-emerald-600">Key saved! AI Export is now active.</p>}
              <button
                type="submit"
                disabled={saving || !keyInput.trim()}
                className="w-full px-4 py-2.5 text-sm font-semibold text-white rounded-lg transition-all disabled:opacity-50 shadow-sm"
                style={{ background: 'linear-gradient(135deg, #6366f1, #8b5cf6, #06b6d4)' }}
              >
                {saving ? 'Saving…' : '✦ Save & Enable AI Export'}
              </button>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}
