const pool = require("../db");
const AppError = require("../utils/AppError");
const { generateUniqueCode } = require("./budgetMasterCodeService");

const HEAD_SELECT = `
  id,
  head_code,
  head_name,
  remarks,
  is_active,
  created_by_user_id,
  created_at,
  updated_at
`;

const getBudgetHeadById = async (id) => {
  const result = await pool.query(
    `
    SELECT ${HEAD_SELECT}
    FROM budget_heads
    WHERE id = $1
    `,
    [id]
  );

  if (result.rowCount === 0) {
    throw new AppError(404, "Budget head not found");
  }

  return result.rows[0];
};

const assertActiveBudgetHead = async (budgetHeadId, client = pool) => {
  const result = await client.query(
    `
    SELECT id, is_active
    FROM budget_heads
    WHERE id = $1
    `,
    [budgetHeadId]
  );

  if (result.rowCount === 0) {
    throw new AppError(404, "Budget head not found");
  }

  if (!result.rows[0].is_active) {
    throw new AppError(400, "Budget head must be active");
  }

  return result.rows[0];
};

const listBudgetHeads = async ({ search = "", isActive, includeSubHeads = false }) => {
  const params = [`%${search.trim()}%`];
  let query = `
    SELECT ${HEAD_SELECT}
    FROM budget_heads
    WHERE (
      head_code ILIKE $1
      OR head_name ILIKE $1
      OR COALESCE(remarks, '') ILIKE $1
    )
  `;

  if (isActive === true || isActive === false) {
    params.push(isActive);
    query += ` AND is_active = $${params.length}`;
  }

  query += ` ORDER BY is_active DESC, head_name ASC`;

  const result = await pool.query(query, params);
  const heads = result.rows;

  if (!includeSubHeads || heads.length === 0) {
    return heads;
  }

  const headIds = heads.map((head) => head.id);
  const subHeadResult = await pool.query(
    `
    SELECT
      id,
      budget_head_id,
      sub_head_code,
      sub_head_name,
      remarks,
      is_active,
      created_at,
      updated_at
    FROM budget_sub_heads
    WHERE budget_head_id = ANY($1::int[])
    ORDER BY is_active DESC, sub_head_name ASC
    `,
    [headIds]
  );

  const subHeadsByHeadId = subHeadResult.rows.reduce((accumulator, subHead) => {
    if (!accumulator[subHead.budget_head_id]) {
      accumulator[subHead.budget_head_id] = [];
    }
    accumulator[subHead.budget_head_id].push(subHead);
    return accumulator;
  }, {});

  return heads.map((head) => ({
    ...head,
    sub_heads: subHeadsByHeadId[head.id] || [],
  }));
};

const createBudgetHead = async ({ userId, headName, remarks = "" }) => {
  const client = await pool.connect();

  try {
    await client.query("BEGIN");
    const headCode = await generateUniqueCode({
      table: "budget_heads",
      codeColumn: "head_code",
      name: headName,
      client,
      maxLength: 30,
    });

    const result = await client.query(
      `
      INSERT INTO budget_heads (
        head_code,
        head_name,
        remarks,
        created_by_user_id
      )
      VALUES ($1, $2, $3, $4)
      RETURNING ${HEAD_SELECT}
      `,
      [headCode, headName, remarks || null, userId]
    );

    await client.query("COMMIT");
    return result.rows[0];
  } catch (err) {
    await client.query("ROLLBACK");

    if (err.code === "23505") {
      throw new AppError(409, "A budget head with this name already exists");
    }

    throw err;
  } finally {
    client.release();
  }
};

const updateBudgetHead = async ({ id, headName, remarks = "" }) => {
  try {
    const result = await pool.query(
      `
      UPDATE budget_heads
      SET
        head_name = $1,
        remarks = $2,
        updated_at = NOW()
      WHERE id = $3
      RETURNING ${HEAD_SELECT}
      `,
      [headName, remarks || null, id]
    );

    if (result.rowCount === 0) {
      throw new AppError(404, "Budget head not found");
    }

    return result.rows[0];
  } catch (err) {
    if (err.code === "23505") {
      throw new AppError(409, "A budget head with this name already exists");
    }

    throw err;
  }
};

const updateBudgetHeadStatus = async (id, isActive) => {
  const result = await pool.query(
    `
    UPDATE budget_heads
    SET
      is_active = $1,
      updated_at = NOW()
    WHERE id = $2
    RETURNING ${HEAD_SELECT}
    `,
    [Boolean(isActive), id]
  );

  if (result.rowCount === 0) {
    throw new AppError(404, "Budget head not found");
  }

  return result.rows[0];
};

module.exports = {
  HEAD_SELECT,
  getBudgetHeadById,
  assertActiveBudgetHead,
  listBudgetHeads,
  createBudgetHead,
  updateBudgetHead,
  updateBudgetHeadStatus,
};
