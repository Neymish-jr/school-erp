const STORAGE_KEY = "activeSchoolId";

export const getActiveSchoolId = () => {
  const raw = localStorage.getItem(STORAGE_KEY);
  const schoolId = Number(raw);

  return Number.isInteger(schoolId) && schoolId > 0 ? schoolId : null;
};

export const setActiveSchoolId = (schoolId) => {
  if (schoolId == null) {
    localStorage.removeItem(STORAGE_KEY);
    return;
  }

  localStorage.setItem(STORAGE_KEY, String(schoolId));
};

export const clearActiveSchoolId = () => {
  localStorage.removeItem(STORAGE_KEY);
};

export const applySchoolContextFromPermissions = (schoolContext) => {
  if (!schoolContext?.schools?.length) {
    return null;
  }

  const storedSchoolId = getActiveSchoolId();
  const storedIsValid = schoolContext.schools.some(
    (school) => school.id === storedSchoolId
  );
  const activeSchoolId = storedIsValid
    ? storedSchoolId
    : schoolContext.activeSchoolId ?? schoolContext.schools[0]?.id ?? null;

  if (activeSchoolId != null) {
    setActiveSchoolId(activeSchoolId);
  }

  return activeSchoolId;
};
