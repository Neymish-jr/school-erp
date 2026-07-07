export const DAY_ORDER = [
  "monday",
  "tuesday",
  "wednesday",
  "thursday",
  "friday",
  "saturday",
];

export const DAY_LABELS = {
  monday: "Monday",
  tuesday: "Tuesday",
  wednesday: "Wednesday",
  thursday: "Thursday",
  friday: "Friday",
  saturday: "Saturday",
};

const JS_DAY_TO_KEY = {
  0: "sunday",
  1: "monday",
  2: "tuesday",
  3: "wednesday",
  4: "thursday",
  5: "friday",
  6: "saturday",
};

export const getTodayDayKey = () => {
  const key = JS_DAY_TO_KEY[new Date().getDay()];
  return DAY_ORDER.includes(key) ? key : "monday";
};

export const formatTimetableTime = (value) => {
  if (!value) {
    return "—";
  }

  return String(value).slice(0, 5);
};

export const sortByPeriod = (left, right) =>
  Number(left.period_number) - Number(right.period_number);
