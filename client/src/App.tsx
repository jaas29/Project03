import { Routes, Route, Navigate, useLocation } from 'react-router-dom';
import { useAuth } from './store/auth';
import Login from './pages/Login';
import Register from './pages/Register';
import Home from './pages/Home';
import Duel from './pages/Duel';

function ProtectedRoute({ children }: { children: React.ReactElement }) {
  const { user, loading } = useAuth();
  const location = useLocation();

  if (loading) {
    return (
      <div className="grid min-h-screen place-items-center bg-cream-50 font-mono text-[11px] uppercase tracking-widest text-ink-soft">
        Loading…
      </div>
    );
  }
  if (!user) {
    return <Navigate to="/login" state={{ from: location.pathname }} replace />;
  }
  return children;
}

function PublicOnlyRoute({ children }: { children: React.ReactElement }) {
  const { user, loading } = useAuth();
  if (loading) return null;
  if (user) return <Navigate to="/" replace />;
  return children;
}

export default function App() {
  return (
    <Routes>
      <Route
        path="/"
        element={
          <ProtectedRoute>
            <Home />
          </ProtectedRoute>
        }
      />
      <Route
        path="/login"
        element={
          <PublicOnlyRoute>
            <Login />
          </PublicOnlyRoute>
        }
      />
      <Route
        path="/register"
        element={
          <PublicOnlyRoute>
            <Register />
          </PublicOnlyRoute>
        }
      />
      <Route
        path="/duel"
        element={
          <ProtectedRoute>
            <Duel />
          </ProtectedRoute>
        }
      />
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}
