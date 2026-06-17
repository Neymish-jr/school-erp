const FINANCIAL_YEAR_STATUS = {
  ACTIVE: "active",
  CLOSED: "closed",
};

const FINANCIAL_YEAR_STATUS_VALUES = Object.values(FINANCIAL_YEAR_STATUS);

/** Standard list ordering: active first, then start_date descending. */
const FINANCIAL_YEAR_LIST_ORDER = `
  ORDER BY
    CASE WHEN status = 'active' THEN 0 ELSE 1 END,
    start_date DESC
`;

module.exports = {
  FINANCIAL_YEAR_STATUS,
  FINANCIAL_YEAR_STATUS_VALUES,
  FINANCIAL_YEAR_LIST_ORDER,
};
