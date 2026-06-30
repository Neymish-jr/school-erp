const OFFICIAL_CHARGE_CODE_BY_NAME = new Map(
  [
    ["PM SHRI Incharge", "pm_shri_incharge"],
    ["Mid Day Meal Incharge", "mdm_incharge"],
    ["Examination Incharge", "board_exam_incharge"],
    ["Scholarship Incharge", "scholarship_incharge"],
    ["Sports Incharge", "sports_incharge"],
    ["Time Table Incharge", "timetable_incharge"],
    ["Discipline Incharge", "discipline_incharge"],
    ["Cultural Incharge", "cultural_incharge"],
    ["ICT Incharge", "ict_incharge"],
    ["UDISE Incharge", "udise_incharge"],
    ["Principal Incharge", "principal_incharge"],
    ["Library Incharge", "library_incharge"],
  ].map(([name, code]) => [name.trim().toLowerCase(), code])
);

const PM_SHRI_CHARGE_CODE = "pm_shri_incharge";

const slugifyChargeName = (chargeName) => {
  const slug = String(chargeName || "")
    .trim()
    .replace(/[^a-zA-Z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "")
    .toLowerCase();

  return slug || "charge";
};

const resolveChargeCode = (chargeName) => {
  const normalizedName = String(chargeName || "").trim();
  const officialCode = OFFICIAL_CHARGE_CODE_BY_NAME.get(normalizedName.toLowerCase());

  if (officialCode) {
    return officialCode;
  }

  return slugifyChargeName(normalizedName);
};

const isPmShriChargeCode = (chargeCode) =>
  String(chargeCode || "") === PM_SHRI_CHARGE_CODE;

module.exports = {
  PM_SHRI_CHARGE_CODE,
  isPmShriChargeCode,
  resolveChargeCode,
  slugifyChargeName,
};
