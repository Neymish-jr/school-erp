import { Navigate } from "react-router-dom";
import { usePermissions } from "../hooks/usePermissions";
import { getRoutePermissionRule } from "../config/routePermissions";

function PermissionRoute({ permissions, mode = "any", children }) {
  const { loading, canAny, canAll } = usePermissions();

  if (loading) {
    return null;
  }

  const keys = Array.isArray(permissions) ? permissions : [permissions];
  const allowed = mode === "all" ? canAll(keys) : canAny(keys);

  if (!allowed) {
    return <Navigate to="/unauthorized" replace />;
  }

  return children;
}

export function RoutePermissionGuard({ pathname, children }) {
  const { loading } = usePermissions();
  const rule = getRoutePermissionRule(pathname);

  if (loading) {
    return null;
  }

  if (!rule) {
    return children;
  }

  return (
    <PermissionRoute permissions={rule.permissions} mode={rule.mode || "any"}>
      {children}
    </PermissionRoute>
  );
}

export default PermissionRoute;
