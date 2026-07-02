import { usePermissions } from "../hooks/usePermissions";

function Permission({ permission, children }) {
  const { can, loading } = usePermissions();

  if (loading || !can(permission)) {
    return null;
  }

  return children;
}

export default Permission;
