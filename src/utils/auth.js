export const decodeAuthToken = () => {
  try {
    const token = localStorage.getItem("token");
    if (!token) return {};

    const [, payload] = token.split(".");
    const normalized = payload.replace(/-/g, "+").replace(/_/g, "/");
    return JSON.parse(atob(normalized)) || {};
  } catch {
    return {};
  }
};

export const getAuthRole = () => decodeAuthToken().role || null;

export const isSuperAdmin = () => getAuthRole() === "super_admin";

export const canAccessNavItem = (item, role = getAuthRole()) => {
  if (!item?.roles?.length) return true;
  return item.roles.includes(role);
};
