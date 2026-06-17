import { Navigate } from "react-router-dom";
import { getAuthRole } from "../utils/auth";

function SuperAdminRoute({ children }) {
  const token = localStorage.getItem("token");

  if (!token) {
    return <Navigate to="/" replace />;
  }

  if (getAuthRole() !== "super_admin") {
    return <Navigate to="/dashboard" replace />;
  }

  return children;
}

export default SuperAdminRoute;
