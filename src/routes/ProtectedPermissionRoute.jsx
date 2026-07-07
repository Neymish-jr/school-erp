import { Navigate, useLocation } from "react-router-dom";
import { getRoutePermissionRule } from "../config/routePermissions";
import {
  shouldRedirectTeacherFromPath,
  TEACHER_BLOCKED_REDIRECT,
} from "../config/teacherRouteGuards";
import { usePermissions } from "../hooks/usePermissions";

function PermissionLoadingScreen() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-slate-950">
      <div className="flex flex-col items-center gap-4 text-slate-400">
        <div
          className="h-10 w-10 animate-spin rounded-full border-2 border-orange-500 border-t-transparent"
          aria-hidden="true"
        />
        <p className="text-sm">Loading permissions...</p>
      </div>
    </div>
  );
}

function ProtectedPermissionRoute({ children }) {
  const { pathname } = useLocation();
  const { loading, isAuthenticated, schoolContextReady, canAny, canAll, role } = usePermissions();
  const rule = getRoutePermissionRule(pathname);

  if (loading || !schoolContextReady) {
    return <PermissionLoadingScreen />;
  }

  if (!isAuthenticated) {
    return <Navigate to="/" replace />;
  }

  if (!rule) {
    return children;
  }

  const allowed =
    rule.mode === "all" ? canAll(rule.permissions) : canAny(rule.permissions);

  if (!allowed) {
    return <Navigate to="/unauthorized" replace />;
  }

  if (shouldRedirectTeacherFromPath(pathname, role)) {
    return <Navigate to={TEACHER_BLOCKED_REDIRECT} replace />;
  }

  return children;
}

export default ProtectedPermissionRoute;
