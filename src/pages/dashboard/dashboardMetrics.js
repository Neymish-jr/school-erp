export const parseWidgetValue = (response) => {
  const value = response?.data?.data;

  if (typeof value === "number" && !Number.isNaN(value)) {
    return value;
  }

  return 0;
};

export const computeVacancyPercentage = (vacant, sanctionedStrength) => {
  if (sanctionedStrength <= 0) {
    return "0";
  }

  return ((vacant / sanctionedStrength) * 100).toFixed(1);
};

export const formatDashboardCurrency = (value) => {
  const amount = Number(value);
  if (Number.isNaN(amount)) return "₹0.00";

  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(amount);
};

export const sumExpenseSummary = (summary, statuses) =>
  (summary || [])
    .filter((row) => statuses.includes(row.status))
    .reduce((total, row) => total + Number(row.request_count || 0), 0);
