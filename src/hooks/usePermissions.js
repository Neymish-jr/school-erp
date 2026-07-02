import { useCallback, useMemo } from "react";
import { usePermissionContext } from "../context/PermissionContext";

const normalizeKeys = (permissionKeys) =>
  (Array.isArray(permissionKeys) ? permissionKeys : [permissionKeys]).filter(Boolean);

export function usePermissions() {
  const {
    user,
    role,
    permissions,
    administrativeCharges,
    overridesApplied,
    loading,
    isAuthenticated,
    schools,
    activeSchoolId,
    schoolContextReady,
    selectActiveSchool,
    reloadPermissions,
    clearPermissions,
  } = usePermissionContext();

  const can = useCallback(
    (permissionKey) => {
      if (!permissionKey) {
        return false;
      }

      return permissions.has(permissionKey);
    },
    [permissions]
  );

  const canAny = useCallback(
    (permissionKeys) => {
      const keys = normalizeKeys(permissionKeys);
      return keys.some((permissionKey) => permissions.has(permissionKey));
    },
    [permissions]
  );

  const canAll = useCallback(
    (permissionKeys) => {
      const keys = normalizeKeys(permissionKeys);
      return keys.length > 0 && keys.every((permissionKey) => permissions.has(permissionKey));
    },
    [permissions]
  );

  return useMemo(
    () => ({
      user,
      role,
      permissions,
      administrativeCharges,
      overridesApplied,
      loading,
      isLoading: loading,
      isAuthenticated,
      schools,
      activeSchoolId,
      schoolContextReady,
      selectActiveSchool,
      can,
      canAny,
      canAll,
      reloadPermissions,
      clearPermissions,
    }),
    [
      user,
      role,
      permissions,
      administrativeCharges,
      overridesApplied,
      loading,
      isAuthenticated,
      schools,
      activeSchoolId,
      schoolContextReady,
      selectActiveSchool,
      can,
      canAny,
      canAll,
      reloadPermissions,
      clearPermissions,
    ]
  );
}

export default usePermissions;
