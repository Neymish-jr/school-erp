import { Navigate } from "react-router-dom";
import { ADMIN_LIKE_LEGACY_ROLES } from "../constants/roles";
import { getAuthRole } from "../utils/auth";

function AdminOrSuperAdminRoute({ children }) {
  const token = localStorage.getItem("token");

  if (!token) {
    return <Navigate to="/" replace />;
  }

  const role = getAuthRole();
  if (!ADMIN_LIKE_LEGACY_ROLES.includes(role)) {
    return <Navigate to="/dashboard" replace />;
  }

  return children;
}

export default AdminOrSuperAdminRoute;
