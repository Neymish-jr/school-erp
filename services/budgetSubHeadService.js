const pool = require("../db");
const AppError = require("../utils/AppError");
const { generateUniqueCode } = require("./budgetMasterCodeService");
const { assertActiveBudgetHead, getBudgetHeadById } = require("./budgetHeadService");

const SUB_HEAD_SELECT = `
  bsh.id,
  bsh.budget_head_id,
  bsh.sub_head_code,
  bsh.sub_head_name,
  bsh.remarks,
  bsh.is_active,
  bsh.created_by_user_id,
  bsh.created_at,
  bsh.updated_at,
  bh.head_code,
  bh.head_name AS budget_head_name
`;

const SUB_HEAD_FROM = `
  FROM budget_sub_heads bsh
  INNER JOIN budget_heads bh ON bh.id = bsh.budget_head_id
`;

const getBudgetSubHeadById = async (id) => {
  const result = await pool.query(
    `
    SELECT ${SUB_HEAD_SELECT}
    ${SUB_HEAD_FROM}
    WHERE bsh.id = $1
    `,
    [id]
  );

  if (result.rowCount === 0) {
    throw new AppError(404, "Budget sub head not found");
  }

  return result.rows[0];
};

const assertActiveBudgetSubHead = async (budgetSubHeadId, client = pool) => {
  const result = await client.query(
    `
    SELECT
      bsh.id,
      bsh.is_active,
      bh.is_active AS budget_head_is_active
    FROM budget_sub_heads bsh
    INNER JOIN budget_heads bh ON bh.id = bsh.budget_head_id
    WHERE bsh.id = $1
    `,
    [budgetSubHeadId]
  );

  if (result.rowCount === 0) {
    throw new AppError(404, "Budget sub head not found");
  }

  const row = result.rows[0];

  if (!row.budget_head_is_active) {
    throw new AppError(400, "Parent budget head is inactive");
  }

  if (!row.is_active) {
    throw new AppError(400, "Budget sub head must be active");
  }

  return row;
};

const listBudgetSubHeads = async ({
  search = "",
  budgetHeadId,
  isActive,
}) => {
  const params = [`%${search.trim()}%`];
  let query = `
    SELECT ${SUB_HEAD_SELECT}
    ${SUB_HEAD_FROM}
    WHERE (
      bsh.sub_head_code ILIKE $1
      OR bsh.sub_head_name ILIKE $1
      OR COALESCE(bsh.remarks, '') ILIKE $1
      OR bh.head_name ILIKE $1
    )
  `;

  if (budgetHeadId) {
    params.push(budgetHeadId);
    query += ` AND bsh.budget_head_id = $${params.length}`;
  }

  if (isActive === true || isActive === false) {
    params.push(isActive);
    query += ` AND bsh.is_active = $${params.length}`;
  }

  query += ` ORDER BY bh.head_name ASC, bsh.is_active DESC, bsh.sub_head_name ASC`;

  const result = await pool.query(query, params);
  return result.rows;
};

const createBudgetSubHead = async ({
  userId,
  budgetHeadId,
  subHeadName,
  remarks = "",
}) => {
  const client = await pool.connect();

  try {
    await client.query("BEGIN");
    await assertActiveBudgetHead(budgetHeadId, client);

    const subHeadCode = await generateUniqueCode({
      table: "budget_sub_heads",
      codeColumn: "sub_head_code",
      name: subHeadName,
      client,
      maxLength: 30,
    });

    const result = await client.query(
      `
      INSERT INTO budget_sub_heads (
        budget_head_id,
        sub_head_code,
        sub_head_name,
        remarks,
        created_by_user_id
      )
      VALUES ($1, $2, $3, $4, $5)
      RETURNING id
      `,
      [budgetHeadId, subHeadCode, subHeadName, remarks || null, userId]
    );

    await client.query("COMMIT");
    return getBudgetSubHeadById(result.rows[0].id);
  } catch (err) {
    await client.query("ROLLBACK");

    if (err.code === "23505") {
      throw new AppError(
        409,
        "A budget sub head with this name already exists under the selected budget head"
      );
    }

    throw err;
  } finally {
    client.release();
  }
};

const updateBudgetSubHead = async ({
  id,
  budgetHeadId,
  subHeadName,
  remarks = "",
}) => {
  await getBudgetHeadById(budgetHeadId);

  try {
    const result = await pool.query(
      `
      UPDATE budget_sub_heads
      SET
        budget_head_id = $1,
        sub_head_name = $2,
        remarks = $3,
        updated_at = NOW()
      WHERE id = $4
      RETURNING id
      `,
      [budgetHeadId, subHeadName, remarks || null, id]
    );

    if (result.rowCount === 0) {
      throw new AppError(404, "Budget sub head not found");
    }

    return getBudgetSubHeadById(result.rows[0].id);
  } catch (err) {
    if (err.code === "23505") {
      throw new AppError(
        409,
        "A budget sub head with this name already exists under the selected budget head"
      );
    }

    throw err;
  }
};

const updateBudgetSubHeadStatus = async (id, isActive) => {
  const result = await pool.query(
    `
    UPDATE budget_sub_heads
    SET
      is_active = $1,
      updated_at = NOW()
    WHERE id = $2
    RETURNING id
    `,
    [Boolean(isActive), id]
  );

  if (result.rowCount === 0) {
    throw new AppError(404, "Budget sub head not found");
  }

  return getBudgetSubHeadById(result.rows[0].id);
};

module.exports = {
  SUB_HEAD_SELECT,
  getBudgetSubHeadById,
  assertActiveBudgetSubHead,
  listBudgetSubHeads,
  createBudgetSubHead,
  updateBudgetSubHead,
  updateBudgetSubHeadStatus,
};
