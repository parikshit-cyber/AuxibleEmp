import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { AuthProvider } from "@/context/AuthContext";
import { Toaster } from "@/components/ui/sonner";
import ProtectedRoute from "@/components/ProtectedRoute";
import Login from "@/pages/Login";
import EmployeeLayout from "@/pages/employee/EmployeeLayout";
import EmployeeHome from "@/pages/employee/EmployeeHome";
import EmployeeUpdates from "@/pages/employee/EmployeeUpdates";
import EmployeeAlerts from "@/pages/employee/EmployeeAlerts";
import AdminLayout from "@/pages/admin/AdminLayout";
import LiveMonitor from "@/pages/admin/LiveMonitor";
import Analytics from "@/pages/admin/Analytics";
import Employees from "@/pages/admin/Employees";
import UpdatesFeed from "@/pages/admin/UpdatesFeed";
import AttendanceTab from "@/pages/admin/AttendanceTab";
import "@/App.css";

function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Routes>
          <Route path="/login" element={<Login />} />

          <Route
            path="/app"
            element={
              <ProtectedRoute role="employee">
                <EmployeeLayout />
              </ProtectedRoute>
            }
          >
            <Route index element={<EmployeeHome />} />
            <Route path="updates" element={<EmployeeUpdates />} />
            <Route path="alerts" element={<EmployeeAlerts />} />
          </Route>

          <Route
            path="/admin"
            element={
              <ProtectedRoute staff>
                <AdminLayout />
              </ProtectedRoute>
            }
          >
            <Route index element={<LiveMonitor />} />
            <Route path="analytics" element={<Analytics />} />
            <Route path="employees" element={<Employees />} />
            <Route path="updates" element={<UpdatesFeed />} />
            <Route path="attendance" element={<AttendanceTab />} />
          </Route>

          <Route path="*" element={<Navigate to="/login" replace />} />
        </Routes>
      </BrowserRouter>
      <Toaster position="top-right" theme="dark" richColors />
    </AuthProvider>
  );
}

export default App;
