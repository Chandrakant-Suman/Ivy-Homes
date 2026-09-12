import { Navigate, useLocation } from 'react-router-dom';
import { tokenStore } from '../services/api.js';
import Navbar from './Navbar.jsx';

// Guards the app pages: if there is no token, bounce to /login.
export default function ProtectedRoute({ children }) {
  const location = useLocation();
  if (!tokenStore.access) {
    return <Navigate to="/login" replace state={{ from: location.pathname }} />;
  }
  return (
    <div className="min-h-full">
      <Navbar />
      <main className="mx-auto max-w-6xl px-4 py-6">{children}</main>
    </div>
  );
}
