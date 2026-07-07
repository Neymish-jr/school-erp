const cashbookEntryService = require("../services/cashbookEntryService");
const { LEGACY_CASHBOOK_MAX_ROWS } = require("../constants/cashbookEntry");
const { successResponse, errorResponse } = require("../utils/response");
const { resolveSchoolScope } = require("../utils/tenantScope");

/**
 * @deprecated Use GET /api/finance/cashbook instead.
 * Delegates to Cashbook V2 with tenant scoping (no global legacy expenses query).
 */
const getCashbook = async (req, res) => {
  try {
    const scope = resolveSchoolScope(req, res);
    if (!scope) {
      return;
    }

    const result = await cashbookEntryService.listCashbookEntries({
      schoolId: scope.schoolId,
      role: scope.role,
      page: 1,
      limit: LEGACY_CASHBOOK_MAX_ROWS,
    });

    const data = result.data.map((row) => ({
      payment_date: row.entry_date,
      voucher_no: row.voucher_no,
      item_name: row.description,
      amount: row.amount,
      vendor_name: row.vendor_name,
      transaction_id: row.transaction_id,
    }));

    res.setHeader("Deprecation", "true");
    res.setHeader("Link", '</api/finance/cashbook>; rel="successor-version"');

    return successResponse(res, {
      message:
        "Legacy cashbook endpoint is deprecated. Use GET /api/finance/cashbook for school-scoped ledger data.",
      data,
      deprecated: true,
      pagination: result.pagination,
    });
  } catch (err) {
    console.error(err);
    return errorResponse(res, {
      message: "Error fetching cashbook",
      error: err.message,
      status: err.statusCode || 500,
    });
  }
};

module.exports = {
  getCashbook,
};
