import { Routes, Route, Navigate } from 'react-router-dom';
import ProtectedRoute from './components/ProtectedRoute.jsx';
import Login from './pages/Login.jsx';
import Listings from './pages/Listings.jsx';
import ListingDetail from './pages/ListingDetail.jsx';
import Rentals from './pages/Rentals.jsx';
import Projects from './pages/Projects.jsx';
import Favourites from './pages/Favourites.jsx';
import Insights from './pages/Insights.jsx';

const protect = (el) => <ProtectedRoute>{el}</ProtectedRoute>;

export default function App() {
  return (
    <Routes>
      <Route path="/login" element={<Login />} />
      <Route path="/listings" element={protect(<Listings />)} />
      <Route path="/listings/:id" element={protect(<ListingDetail />)} />
      <Route path="/rentals" element={protect(<Rentals />)} />
      <Route path="/projects" element={protect(<Projects />)} />
      <Route path="/favourites" element={protect(<Favourites />)} />
      <Route path="/insights" element={protect(<Insights />)} />
      <Route path="/" element={<Navigate to="/listings" replace />} />
      <Route path="*" element={<Navigate to="/listings" replace />} />
    </Routes>
  );
}
