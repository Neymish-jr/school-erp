import { ROLES } from "../constants/roles";

/** Routes teachers must not access (admin master-data / staff directory). */
export const TEACHER_BLOCKED_ROUTES = ["/students", "/classes", "/subjects", "/teachers"];

export const TEACHER_BLOCKED_REDIRECT = "/dashboard";

export const isTeacherBlockedPath = (pathname) => {
  const normalized = pathname.split("?")[0];

  return TEACHER_BLOCKED_ROUTES.some(
    (route) => normalized === route || normalized.startsWith(`${route}/`)
  );
};

export const shouldRedirectTeacherFromPath = (pathname, role) =>
  role === ROLES.TEACHER && isTeacherBlockedPath(pathname);
