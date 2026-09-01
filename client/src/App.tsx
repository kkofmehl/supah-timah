import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { useEffect, useState } from 'react';
import { checkAuth } from './lib/api';
import { LoginPage } from './pages/LoginPage';
import { HomePage } from './pages/HomePage';
import { NewTimerPage } from './pages/NewTimerPage';
import { EditTimerPage } from './pages/EditTimerPage';
import { RunTimerPage } from './pages/RunTimerPage';

function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const [authed, setAuthed] = useState<boolean | null>(null);

  useEffect(() => {
    checkAuth().then(setAuthed);
  }, []);

  if (authed === null) {
    return (
      <div className="min-h-full flex items-center justify-center">
        <p className="text-gray-400">Loading…</p>
      </div>
    );
  }

  if (!authed) return <Navigate to="/login" replace />;
  return <>{children}</>;
}

export function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/login" element={<LoginPage />} />
        <Route
          path="/"
          element={
            <ProtectedRoute>
              <HomePage />
            </ProtectedRoute>
          }
        />
        <Route
          path="/new"
          element={
            <ProtectedRoute>
              <NewTimerPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="/edit/:id"
          element={
            <ProtectedRoute>
              <EditTimerPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="/run/:id"
          element={
            <ProtectedRoute>
              <RunTimerPage />
            </ProtectedRoute>
          }
        />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  );
}
