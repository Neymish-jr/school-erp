import { Navigate } from "react-router-dom";
import { LEGACY_ROLES } from "../constants/roles";
import { getAuthRole } from "../utils/auth";

function SuperAdminRoute({ children }) {
  const token = localStorage.getItem("token");

  if (!token) {
    return <Navigate to="/" replace />;
  }

  if (getAuthRole() !== LEGACY_ROLES.SUPER_ADMIN) {
    return <Navigate to="/dashboard" replace />;
  }

  return children;
}

export default SuperAdminRoute;
