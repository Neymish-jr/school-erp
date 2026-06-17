import { Navigate } from "react-router-dom";
import { getAuthRole } from "../utils/auth";

function AdminOrSuperAdminRoute({ children }) {
  const token = localStorage.getItem("token");

  if (!token) {
    return <Navigate to="/" replace />;
  }

  const role = getAuthRole();
  if (!["admin", "super_admin"].includes(role)) {
    return <Navigate to="/dashboard" replace />;
  }

  return children;
}

export default AdminOrSuperAdminRoute;
