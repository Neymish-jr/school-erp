const STOCK_CATEGORIES = [
  "sports",
  "library",
  "ict",
  "science_lab",
  "furniture",
  "teaching_learning_material",
  "office_supplies",
];

const STOCK_CATEGORY_LABELS = {
  sports: "Sports",
  library: "Library",
  ict: "ICT",
  science_lab: "Science Lab",
  furniture: "Furniture",
  teaching_learning_material: "Teaching Learning Material",
  office_supplies: "Office Supplies",
};

const STOCK_ISSUE_TYPES = ["teacher", "activity", "department"];

const STOCK_ENTRY_SOURCES = ["manual", "expense_payment"];

const DEFAULT_LOW_STOCK_THRESHOLD = 5;

const getLowStockThreshold = () => {
  const configured = Number(process.env.LOW_STOCK_THRESHOLD);

  if (Number.isFinite(configured) && configured >= 0) {
    return configured;
  }

  return DEFAULT_LOW_STOCK_THRESHOLD;
};

module.exports = {
  STOCK_CATEGORIES,
  STOCK_CATEGORY_LABELS,
  STOCK_ISSUE_TYPES,
  STOCK_ENTRY_SOURCES,
  DEFAULT_LOW_STOCK_THRESHOLD,
  getLowStockThreshold,
};
