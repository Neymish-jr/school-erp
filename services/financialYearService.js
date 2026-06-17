const pool = require("../db");
const AppError = require("../utils/AppError");
const {
  FINANCIAL_YEAR_STATUS,
  FINANCIAL_YEAR_LIST_ORDER,
} = require("../constants/financialYearStatus");

const YEAR_LABEL_PATTERN = /^(\d{4})-(\d{2})$/;

const FINANCIAL_YEAR_SELECT = `
  id,
  school_id,
  year_label,
  to_char(start_date, 'YYYY-MM-DD') AS start_date,
  to_char(end_date, 'YYYY-MM-DD') AS end_date,
  status,
  remarks,
  created_by_user_id,
  created_at,
  updated_at
`;

const FINANCIAL_YEAR_RETURNING = `
  id,
  school_id,
  year_label,
  to_char(start_date, 'YYYY-MM-DD') AS start_date,
  to_char(end_date, 'YYYY-MM-DD') AS end_date,
  status,
  remarks,
  created_by_user_id,
  created_at,
  updated_at
`;

const deriveDatesFromYearLabel = (yearLabel) => {
  const normalized = String(yearLabel || "").trim();
  const match = normalized.match(YEAR_LABEL_PATTERN);

  if (!match) {
    throw new AppError(400, "Financial year label must be in YYYY-YY format (e.g. 2026-27)");
  }

  const startYear = parseInt(match[1], 10);
  const suffix = parseInt(match[2], 10);
  const expectedSuffix = (startYear + 1) % 100;

  if (suffix !== expectedSuffix) {
    throw new AppError(
      400,
      "Financial year label suffix must match the next calendar year (e.g. 2026-27)"
    );
  }

  const endYear = startYear + 1;

  return {
    year_label: `${startYear}-${String(suffix).padStart(2, "0")}`,
    start_date: `${startYear}-04-01`,
    end_date: `${endYear}-03-31`,
  };
};

const assertNoOverlap = async (client, schoolId, startDate, endDate, excludeId = null) => {
  const params = [schoolId, startDate, endDate];
  let excludeClause = "";

  if (excludeId != null) {
    params.push(excludeId);
    excludeClause = `AND id <> $${params.length}`;
  }

  const result = await client.query(
    `
    SELECT id, year_label
    FROM financial_years
    WHERE school_id = $1
      AND start_date <= $3::date
      AND end_date >= $2::date
      ${excludeClause}
    LIMIT 1
    `,
    params
  );

  if (result.rowCount > 0) {
    throw new AppError(
      409,
      `Financial year overlaps with existing year ${result.rows[0].year_label}`
    );
  }
};

const getFinancialYearById = async (id, schoolId, client = pool) => {
  const result = await client.query(
    `
    SELECT
      ${FINANCIAL_YEAR_SELECT}
    FROM financial_years
    WHERE id = $1
      AND school_id = $2
    `,
    [id, schoolId]
  );

  if (result.rowCount === 0) {
    throw new AppError(404, "Financial year not found");
  }

  return result.rows[0];
};

const createFinancialYear = async ({ schoolId, userId, yearLabel, remarks = "" }) => {
  const derived = deriveDatesFromYearLabel(yearLabel);
  const normalizedRemarks = String(remarks || "").trim();

  const client = await pool.connect();

  try {
    await client.query("BEGIN");
    await assertNoOverlap(client, schoolId, derived.start_date, derived.end_date);

    const result = await client.query(
      `
      INSERT INTO financial_years (
        school_id,
        year_label,
        start_date,
        end_date,
        status,
        remarks,
        created_by_user_id
      )
      VALUES ($1, $2, $3, $4, $5, $6, $7)
      RETURNING ${FINANCIAL_YEAR_RETURNING}
      `,
      [
        schoolId,
        derived.year_label,
        derived.start_date,
        derived.end_date,
        FINANCIAL_YEAR_STATUS.CLOSED,
        normalizedRemarks,
        userId,
      ]
    );

    await client.query("COMMIT");
    return result.rows[0];
  } catch (err) {
    await client.query("ROLLBACK");

    if (err.code === "23505") {
      throw new AppError(409, "A financial year with this label already exists for this school");
    }

    throw err;
  } finally {
    client.release();
  }
};

const updateFinancialYear = async ({ id, schoolId, remarks }) => {
  const result = await pool.query(
    `
    UPDATE financial_years
    SET
      remarks = $1,
      updated_at = NOW()
    WHERE id = $2
      AND school_id = $3
    RETURNING ${FINANCIAL_YEAR_RETURNING}
    `,
    [String(remarks || "").trim(), id, schoolId]
  );

  if (result.rowCount === 0) {
    throw new AppError(404, "Financial year not found");
  }

  return result.rows[0];
};

const assertCanActivateByStartDate = async (client, startDate) => {
  const result = await client.query(
    `
    SELECT (CURRENT_DATE >= $1::date) AS can_activate
    `,
    [startDate]
  );

  if (!result.rows[0]?.can_activate) {
    throw new AppError(
      400,
      "Financial year cannot be activated before its start date."
    );
  }
};

const sortFinancialYears = (years = []) =>
  [...years].sort((left, right) => {
    if (left.status === FINANCIAL_YEAR_STATUS.ACTIVE && right.status !== FINANCIAL_YEAR_STATUS.ACTIVE) {
      return -1;
    }

    if (right.status === FINANCIAL_YEAR_STATUS.ACTIVE && left.status !== FINANCIAL_YEAR_STATUS.ACTIVE) {
      return 1;
    }

    return String(right.start_date).localeCompare(String(left.start_date));
  });

const activateFinancialYear = async (id, schoolId) => {
  const client = await pool.connect();

  try {
    await client.query("BEGIN");

    const target = await getFinancialYearById(id, schoolId, client);

    if (target.status === FINANCIAL_YEAR_STATUS.ACTIVE) {
      throw new AppError(400, "Financial year is already active");
    }

    await assertCanActivateByStartDate(client, target.start_date);

    await client.query(
      `
      UPDATE financial_years
      SET status = $1, updated_at = NOW()
      WHERE school_id = $2
        AND status = $3
      `,
      [FINANCIAL_YEAR_STATUS.CLOSED, schoolId, FINANCIAL_YEAR_STATUS.ACTIVE]
    );

    const activated = await client.query(
      `
      UPDATE financial_years
      SET status = $1, updated_at = NOW()
      WHERE id = $2
        AND school_id = $3
      RETURNING ${FINANCIAL_YEAR_RETURNING}
      `,
      [FINANCIAL_YEAR_STATUS.ACTIVE, id, schoolId]
    );

    await client.query("COMMIT");
    return activated.rows[0];
  } catch (err) {
    await client.query("ROLLBACK");
    throw err;
  } finally {
    client.release();
  }
};

const closeFinancialYear = async (id, schoolId) => {
  const existing = await getFinancialYearById(id, schoolId);

  if (existing.status === FINANCIAL_YEAR_STATUS.CLOSED) {
    throw new AppError(400, "Financial year is already closed");
  }

  const result = await pool.query(
    `
    UPDATE financial_years
    SET status = $1, updated_at = NOW()
    WHERE id = $2
      AND school_id = $3
    RETURNING ${FINANCIAL_YEAR_RETURNING}
    `,
    [FINANCIAL_YEAR_STATUS.CLOSED, id, schoolId]
  );

  return result.rows[0];
};

const deleteFinancialYear = async (id, schoolId) => {
  const existing = await getFinancialYearById(id, schoolId);

  if (existing.status === FINANCIAL_YEAR_STATUS.ACTIVE) {
    throw new AppError(400, "Active financial years cannot be deleted.");
  }

  const linkedExpenseRequests = await pool.query(
    `
    SELECT id
    FROM expense_requests er
    INNER JOIN budget_allocations ba ON ba.id = er.budget_allocation_id
    WHERE ba.financial_year_id = $1
      AND ba.school_id = $2
    LIMIT 1
    `,
    [id, schoolId]
  );

  if (linkedExpenseRequests.rowCount > 0) {
    throw new AppError(
      400,
      "Financial years with expense requests cannot be deleted."
    );
  }

  const linkedCashbookEntries = await pool.query(
    `
    SELECT id
    FROM cashbook_entries
    WHERE financial_year_id = $1
      AND school_id = $2
    LIMIT 1
    `,
    [id, schoolId]
  );

  if (linkedCashbookEntries.rowCount > 0) {
    throw new AppError(
      400,
      "Financial years with cashbook entries cannot be deleted."
    );
  }

  const linkedAllocations = await pool.query(
    `
    SELECT id
    FROM budget_allocations
    WHERE financial_year_id = $1
      AND school_id = $2
    LIMIT 1
    `,
    [id, schoolId]
  );

  if (linkedAllocations.rowCount > 0) {
    throw new AppError(
      400,
      "Financial years with budget allocations cannot be deleted."
    );
  }

  const result = await pool.query(
    `
    DELETE FROM financial_years
    WHERE id = $1
      AND school_id = $2
    RETURNING id, year_label
    `,
    [id, schoolId]
  );

  if (result.rowCount === 0) {
    throw new AppError(404, "Financial year not found");
  }

  return result.rows[0];
};

const getActiveFinancialYear = async (schoolId) => {
  const result = await pool.query(
    `
    SELECT
      ${FINANCIAL_YEAR_SELECT}
    FROM financial_years
    WHERE school_id = $1
      AND status = $2
    LIMIT 1
    `,
    [schoolId, FINANCIAL_YEAR_STATUS.ACTIVE]
  );

  return result.rows[0] || null;
};

const listFinancialYears = async ({ schoolId, search = "", status }) => {
  const params = [schoolId, `%${search.trim()}%`];

  let query = `
    SELECT
      ${FINANCIAL_YEAR_SELECT}
    FROM financial_years
    WHERE school_id = $1
      AND (
        year_label ILIKE $2
        OR COALESCE(remarks, '') ILIKE $2
      )
  `;

  if (status === FINANCIAL_YEAR_STATUS.ACTIVE || status === FINANCIAL_YEAR_STATUS.CLOSED) {
    params.push(status);
    query += ` AND status = $${params.length}`;
  }

  query += FINANCIAL_YEAR_LIST_ORDER;

  const result = await pool.query(query, params);
  return result.rows;
};

module.exports = {
  deriveDatesFromYearLabel,
  createFinancialYear,
  updateFinancialYear,
  activateFinancialYear,
  closeFinancialYear,
  deleteFinancialYear,
  getActiveFinancialYear,
  getFinancialYearById,
  listFinancialYears,
  sortFinancialYears,
};
