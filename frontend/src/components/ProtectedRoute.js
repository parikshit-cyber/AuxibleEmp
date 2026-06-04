import { Navigate } from "react-router-dom";
import { useAuth } from "@/context/AuthContext";
import { Loader2 } from "lucide-react";

const STAFF_ROLES = ["owner", "hr", "admin"];

export default function ProtectedRoute({ children, role, staff }) {
  const { user, loading } = useAuth();

  if (loading || user === null) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#0A0A0A]">
        <Loader2 className="h-7 w-7 animate-spin text-[#D4AF37]" />
      </div>
    );
  }

  if (!user) return <Navigate to="/login" replace />;

  const isStaff = STAFF_ROLES.includes(user.role);
  if (staff && !isStaff) return <Navigate to="/app" replace />;
  if (role === "employee" && user.role !== "employee") return <Navigate to="/admin" replace />;

  return children;
}
