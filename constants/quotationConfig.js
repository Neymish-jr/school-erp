const DEFAULT_QUOTATION_REQUIRED_THRESHOLD = 50000;

const getQuotationRequiredThreshold = () => {
  const configured = Number(process.env.QUOTATION_REQUIRED_THRESHOLD);

  if (Number.isFinite(configured) && configured > 0) {
    return configured;
  }

  return DEFAULT_QUOTATION_REQUIRED_THRESHOLD;
};

const requiresQuotationsForAmount = (amount) =>
  Number(amount) >= getQuotationRequiredThreshold();

module.exports = {
  DEFAULT_QUOTATION_REQUIRED_THRESHOLD,
  getQuotationRequiredThreshold,
  requiresQuotationsForAmount,
};
