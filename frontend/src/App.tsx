import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './auth';
import { ToastProvider } from './toast';
import Layout from './Layout';
import LoginPage from './pages/LoginPage';
import DashboardPage from './pages/DashboardPage';
import ApplyLeavePage from './pages/ApplyLeavePage';
import MyRequestsPage from './pages/MyRequestsPage';
import BalancePage from './pages/BalancePage';
import ApprovalsPage from './pages/ApprovalsPage';
import TeamCalendarPage from './pages/TeamCalendarPage';
import HrQueuePage from './pages/HrQueuePage';
import AllBalancesPage from './pages/AllBalancesPage';
import PoliciesPage from './pages/PoliciesPage';
import AuditLogPage from './pages/AuditLogPage';

function ProtectedRoute({ children, allowedRoles }: { children: React.ReactNode, allowedRoles?: string[] }) {
  const { user, isLoading } = useAuth();
  
  if (isLoading) return <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100vh', background: 'var(--color-surface)' }}><div className="skeleton" style={{ width: '100px', height: '100px', borderRadius: '50%' }}></div></div>;
  if (!user) return <Navigate to="/login" />;
  
  // HR inherits Manager roles, so HR can view Manager pages
  let hasRole = true;
  if (allowedRoles) {
    if (allowedRoles.includes('MANAGER') && user.role === 'HR') {
        hasRole = true;
    } else {
        hasRole = allowedRoles.includes(user.role);
    }
  }

  if (!hasRole) return <Navigate to="/" />;
  
  return <>{children}</>;
}

export default function App() {
  return (
    <ToastProvider>
      <AuthProvider>
        <BrowserRouter>
          <Routes>
            <Route path="/login" element={<LoginPage />} />
            
            <Route path="/" element={<ProtectedRoute><Layout /></ProtectedRoute>}>
              {/* Employee routes (accessible to all) */}
              <Route index element={<DashboardPage />} />
              <Route path="apply" element={<ApplyLeavePage />} />
              <Route path="requests" element={<MyRequestsPage />} />
              <Route path="balance" element={<BalancePage />} />
              
              {/* Manager routes (accessible to MANAGER and HR) */}
              <Route path="approvals" element={<ProtectedRoute allowedRoles={['MANAGER']}><ApprovalsPage /></ProtectedRoute>} />
              <Route path="team-calendar" element={<ProtectedRoute allowedRoles={['MANAGER']}><TeamCalendarPage /></ProtectedRoute>} />
              
              {/* HR routes (accessible to HR only) */}
              <Route path="hr-queue" element={<ProtectedRoute allowedRoles={['HR']}><HrQueuePage /></ProtectedRoute>} />
              <Route path="all-balances" element={<ProtectedRoute allowedRoles={['HR']}><AllBalancesPage /></ProtectedRoute>} />
              <Route path="policies" element={<ProtectedRoute allowedRoles={['HR']}><PoliciesPage /></ProtectedRoute>} />
              <Route path="audit" element={<ProtectedRoute allowedRoles={['HR']}><AuditLogPage /></ProtectedRoute>} />
            </Route>
          </Routes>
        </BrowserRouter>
      </AuthProvider>
    </ToastProvider>
  );
}
