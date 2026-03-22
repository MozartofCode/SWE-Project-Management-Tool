import { useState, useRef, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import useAuth from '../hooks/useAuth';
import { getInitials } from '../services/utils';

const ROUTE_LABELS = {
  '/': 'Dashboard',
  '/projects': 'Projects',
  '/users': 'Users',
};

function getPageTitle(pathname) {
  if (ROUTE_LABELS[pathname]) return ROUTE_LABELS[pathname];
  if (pathname.includes('/issues/') && pathname.includes('/edit')) return 'Edit Issue';
  if (pathname.includes('/issues/new')) return 'New Issue';
  if (pathname.includes('/issues/')) return 'Issue Detail';
  if (pathname.endsWith('/edit')) return 'Edit Project';
  if (pathname.endsWith('/new')) return 'New Project';
  if (pathname.startsWith('/projects/')) return 'Project Detail';
  return 'ProjectFlow';
}

export default function Navbar() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef(null);

  const pageTitle = getPageTitle(location.pathname);

  useEffect(() => {
    function handleClickOutside(e) {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target)) {
        setIsOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleLogout = async () => {
    setIsOpen(false);
    await logout();
    navigate('/login', { replace: true });
  };

  return (
    <header className="bg-white border-b border-slate-200 h-16 flex items-center justify-between px-6 shrink-0">
      <h1 className="text-lg font-semibold text-slate-800">{pageTitle}</h1>

      {user && (
        <div className="relative" ref={dropdownRef}>
          <button
            onClick={() => setIsOpen((v) => !v)}
            className="flex items-center gap-2 rounded-lg px-2 py-1.5 hover:bg-slate-100 transition-colors"
          >
            <div className="w-8 h-8 rounded-full bg-indigo-600 flex items-center justify-center text-white text-xs font-semibold">
              {getInitials(user.full_name)}
            </div>
            <span className="text-sm font-medium text-slate-700 hidden sm:block">{user.full_name}</span>
            <svg className="w-4 h-4 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
            </svg>
          </button>

          {isOpen && (
            <div className="absolute right-0 top-12 w-48 bg-white border border-slate-200 rounded-lg shadow-lg py-1 z-20">
              <div className="px-4 py-2 border-b border-slate-100">
                <p className="text-xs text-slate-500">Signed in as</p>
                <p className="text-sm font-medium text-slate-800 truncate">{user.email}</p>
              </div>
              <button
                onClick={handleLogout}
                className="w-full text-left px-4 py-2 text-sm text-rose-600 hover:bg-rose-50 transition-colors"
              >
                Sign out
              </button>
            </div>
          )}
        </div>
      )}
    </header>
  );
}
