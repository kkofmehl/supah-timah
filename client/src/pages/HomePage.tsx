import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import type { TimerSummary } from '@supah-timah/shared';
import { deleteTimer, listTimers, logout } from '../lib/api';
import { formatDurationLabel } from '../components/DurationStepper';

export function HomePage() {
  const [timers, setTimers] = useState<TimerSummary[]>([]);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    document.title = 'Timers — Supah Timah';
    listTimers()
      .then(setTimers)
      .finally(() => setLoading(false));
  }, []);

  const filtered = timers.filter((t) =>
    t.name.toLowerCase().includes(search.toLowerCase()),
  );

  const handleDelete = async (id: string, name: string) => {
    if (!confirm(`Delete "${name}"?`)) return;
    await deleteTimer(id);
    setTimers((prev) => prev.filter((t) => t.id !== id));
  };

  const handleLogout = async () => {
    await logout();
    navigate('/login');
  };

  return (
    <div className="min-h-full flex flex-col">
      <header className="flex items-center justify-between p-4 border-b border-white/10">
        <h1 className="text-xl font-bold">Supah Timah</h1>
        <button
          onClick={handleLogout}
          className="text-sm text-gray-400 active:text-white"
        >
          Logout
        </button>
      </header>

      <div className="p-4 space-y-4 flex-1">
        <input
          type="search"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search timers…"
          className="w-full px-4 py-2 rounded-lg bg-white/10 border border-white/20 focus:outline-none"
        />

        {loading ? (
          <p className="text-gray-400 text-center py-8">Loading…</p>
        ) : filtered.length === 0 ? (
          <p className="text-gray-400 text-center py-8">
            {timers.length === 0
              ? 'No timers yet. Create your first one!'
              : 'No matches found.'}
          </p>
        ) : (
          <ul className="space-y-3">
            {filtered.map((timer) => (
              <li
                key={timer.id}
                className="bg-white/5 rounded-xl p-4 flex items-center gap-3"
              >
                <div className="flex-1 min-w-0">
                  <h2 className="font-semibold truncate">{timer.name}</h2>
                  <p className="text-sm text-gray-400">
                    {formatDurationLabel(timer.totalDurationSeconds)}
                  </p>
                </div>
                <div className="flex gap-2">
                  <Link
                    to={`/run/${timer.id}`}
                    className="px-4 py-2 rounded-lg bg-green-600 font-medium text-sm active:bg-green-700"
                  >
                    Run
                  </Link>
                  <Link
                    to={`/edit/${timer.id}`}
                    className="px-4 py-2 rounded-lg bg-white/10 font-medium text-sm active:bg-white/20"
                  >
                    Edit
                  </Link>
                  <button
                    onClick={() => handleDelete(timer.id, timer.name)}
                    className="px-3 py-2 rounded-lg text-red-400 text-sm active:bg-white/10"
                  >
                    Del
                  </button>
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>

      <div className="p-4 border-t border-white/10">
        <Link
          to="/new"
          className="block w-full py-3 rounded-xl bg-indigo-600 font-semibold text-center text-lg active:bg-indigo-700"
        >
          + New Timer
        </Link>
      </div>
    </div>
  );
}
