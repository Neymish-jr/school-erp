const pool = require("../db");

const generateCodeBase = (name, maxLength = 16) => {
  const alphanumeric = String(name || "")
    .toUpperCase()
    .replace(/[^A-Z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "")
    .replace(/_+/g, "_");

  if (!alphanumeric) {
    return "ITEM";
  }

  return alphanumeric.slice(0, maxLength);
};

const generateUniqueCode = async ({
  table,
  codeColumn,
  name,
  client = pool,
  excludeId = null,
  maxLength = 16,
}) => {
  const baseCode = generateCodeBase(name, maxLength);
  let candidate = baseCode;
  let suffix = 2;

  while (true) {
    const params = [candidate];
    let excludeClause = "";

    if (excludeId != null) {
      params.push(excludeId);
      excludeClause = `AND id <> $${params.length}`;
    }

    const result = await client.query(
      `
      SELECT id
      FROM ${table}
      WHERE ${codeColumn} = $1
        ${excludeClause}
      LIMIT 1
      `,
      params
    );

    if (result.rowCount === 0) {
      return candidate;
    }

    const suffixText = `_${suffix}`;
    candidate = `${baseCode.slice(0, Math.max(1, maxLength - suffixText.length))}${suffixText}`;
    suffix += 1;
  }
};

module.exports = {
  generateCodeBase,
  generateUniqueCode,
};
