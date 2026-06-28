export const getCurrentAcademicYear = () => {
  const now = new Date();
  const year = now.getFullYear();
  const month = now.getMonth();
  const startYear = month >= 3 ? year : year - 1;
  const suffix = (startYear + 1) % 100;

  return `${startYear}-${String(suffix).padStart(2, "0")}`;
};
