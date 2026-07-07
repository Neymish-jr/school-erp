export const PASS_MARK_PERCENTAGE = 40;

export const calculatePercentage = (marksObtained, maxMarks) => {
  const obtained = Number(marksObtained);
  const total = Number(maxMarks);

  if (!Number.isFinite(obtained) || !Number.isFinite(total) || total <= 0) {
    return 0;
  }

  return Math.max(0, Math.min(100, (obtained / total) * 100));
};

export const getResultStatus = (percentage) =>
  Number(percentage) >= PASS_MARK_PERCENTAGE ? "Pass" : "Fail";
