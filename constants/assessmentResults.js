const PASS_MARK_PERCENTAGE = 40;

const GRADE_A_PLUS_MIN = 90;
const GRADE_A_MIN = 75;
const GRADE_B_MIN = 60;

const calculatePercentage = (marksObtained, maxMarks) => {
  const obtained = Number(marksObtained);
  const total = Number(maxMarks);

  if (!Number.isFinite(obtained) || !Number.isFinite(total) || total <= 0) {
    return 0;
  }

  return Math.max(0, Math.min(100, (obtained / total) * 100));
};

const isPassingPercentage = (percentage) =>
  Number(percentage) >= PASS_MARK_PERCENTAGE;

const getResultStatus = (percentage) =>
  isPassingPercentage(percentage) ? "Pass" : "Fail";

const getGrade = (percentage) => {
  const value = Number(percentage);

  if (value >= GRADE_A_PLUS_MIN) {
    return "A+";
  }

  if (value >= GRADE_A_MIN) {
    return "A";
  }

  if (value >= GRADE_B_MIN) {
    return "B";
  }

  if (isPassingPercentage(value)) {
    return "C";
  }

  return "Fail";
};

module.exports = {
  PASS_MARK_PERCENTAGE,
  GRADE_A_PLUS_MIN,
  GRADE_A_MIN,
  GRADE_B_MIN,
  calculatePercentage,
  isPassingPercentage,
  getResultStatus,
  getGrade,
};
