import {BrowserRouter, Navigate, Route, Routes} from 'react-router-dom';
import Layout from './components/Layout';
import ProtectedRoute from './components/ProtectedRoute';
import Login from './pages/Login';
import Register from './pages/Register';
import Dashboard from './pages/Dashboard';
import MapPage from './pages/MapPage';
import Incidents from './pages/Incidents';
import IncidentNew from './pages/IncidentNew';
import IncidentDetail from './pages/IncidentDetail';
import IncidentEdit from './pages/IncidentEdit';
import ReferencePage from './pages/ReferencePage';
import Users from './pages/Users';
import Notifications from './pages/Notifications';
import Profile from './pages/Profile';
import NotFound from './pages/NotFound';

const P = ({roles, children}) => <ProtectedRoute roles={roles}>{children}</ProtectedRoute>;

export default function App() {
  return <BrowserRouter><Routes>
    <Route path="/login" element={<Login />} />
    <Route path="/register" element={<Register />} />
    <Route element={<P><Layout /></P>}>
      <Route index element={<Navigate to="/dashboard" replace />} />
      <Route path="/dashboard" element={<Dashboard />} />
      <Route path="/map" element={<MapPage />} />
      <Route path="/incidents" element={<Incidents />} />
      <Route path="/incidents/new" element={<P roles={['ADMIN', 'DISPATCHER', 'EMPLOYEE']}><IncidentNew /></P>} />
      <Route path="/incidents/:id" element={<IncidentDetail />} />
      <Route path="/incidents/:id/edit" element={<IncidentEdit />} />
      <Route path="/stations" element={<ReferencePage type="stations" />} />
      <Route path="/categories" element={<ReferencePage type="categories" />} />
      <Route path="/users" element={<P roles={['ADMIN']}><Users /></P>} />
      <Route path="/notifications" element={<Notifications />} />
      <Route path="/profile" element={<Profile />} />
    </Route>
    <Route path="*" element={<NotFound />} />
  </Routes></BrowserRouter>;
}
