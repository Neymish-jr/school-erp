const pool = require("../db");
const { successResponse, errorResponse } = require("../utils/response");
const { resolveSchoolIdForWrite } = require("../utils/tenantScope");
const {
  TRANSFER_EVENT_TYPES,
  DESIGNATION_EVENT_TYPES,
} = require("../constants/serviceHistoryEventTypes");
const {
  formatHistoryRow,
  buildTimelineQuery,
  groupServiceBook,
  calculateTenure,
  verifyTeacherInSchool,
  getBaseHistoryQuery,
} = require("../services/staffServiceHistoryService");

const parseListFilters = (query = {}) => {
  const filters = {};

  if (query.event_type) {
    filters.event_type = query.event_type;
  }

  if (query.from_date) {
    filters.from_date = query.from_date;
  }

  if (query.to_date) {
    filters.to_date = query.to_date;
  }

  return filters;
};

const getAssignments = async (req, res) => {
  try {
    const school_id = resolveSchoolIdForWrite(req, res);
    if (school_id == null) {
      return;
    }
    const filters = parseListFilters(req.query);

    if (req.query.teacher_id) {
      filters.teacher_id = Number(req.query.teacher_id);
    }

    const { query, params } = buildTimelineQuery({
      schoolId: school_id,
      teacherId: filters.teacher_id ?? null,
      filters,
    });

    const result = await pool.query(query, params);

    return successResponse(res, {
      message: "Service history fetched successfully",
      data: result.rows.map(formatHistoryRow),
    });
  } catch (err) {
    console.error(err);
    return errorResponse(res, {
      message: "Error fetching service history",
      error: err.message,
      status: 500,
    });
  }
};

const getEventById = async (req, res) => {
  try {
    const school_id = resolveSchoolIdForWrite(req, res);
    if (school_id == null) {
      return;
    }
    const { id } = req.params;

    const result = await pool.query(
      `${getBaseHistoryQuery()} WHERE ssh.id = $1 AND ssh.school_id = $2`,
      [id, school_id]
    );

    if (result.rowCount === 0) {
      return errorResponse(res, {
        message: "Service history event not found",
        error: "Not found",
        status: 404,
      });
    }

    return successResponse(res, {
      message: "Service history event fetched successfully",
      data: formatHistoryRow(result.rows[0]),
    });
  } catch (err) {
    console.error(err);
    return errorResponse(res, {
      message: "Error fetching service history event",
      error: err.message,
      status: 500,
    });
  }
};

const getTeacherTimeline = async (req, res) => {
  try {
    const school_id = resolveSchoolIdForWrite(req, res);
    if (school_id == null) {
      return;
    }
    const { teacherId } = req.params;
    const filters = parseListFilters(req.query);

    const teacher = await verifyTeacherInSchool(pool, teacherId, school_id);
    if (!teacher) {
      return errorResponse(res, {
        message: "Teacher not found in your school",
        error: "Not found",
        status: 404,
      });
    }

    const { query, params } = buildTimelineQuery({
      schoolId: school_id,
      teacherId: Number(teacherId),
      filters,
    });

    const result = await pool.query(query, params);
    const events = result.rows.map(formatHistoryRow);

    return successResponse(res, {
      message: "Teacher service history fetched successfully",
      data: {
        teacher,
        events,
        total_events: events.length,
      },
    });
  } catch (err) {
    console.error(err);
    return errorResponse(res, {
      message: "Error fetching teacher service history",
      error: err.message,
      status: 500,
    });
  }
};

const getTeacherServiceBook = async (req, res) => {
  try {
    const school_id = resolveSchoolIdForWrite(req, res);
    if (school_id == null) {
      return;
    }
    const { teacherId } = req.params;

    const teacher = await verifyTeacherInSchool(pool, teacherId, school_id);
    if (!teacher) {
      return errorResponse(res, {
        message: "Teacher not found in your school",
        error: "Not found",
        status: 404,
      });
    }

    const { query, params } = buildTimelineQuery({
      schoolId: school_id,
      teacherId: Number(teacherId),
      filters: {},
    });

    const result = await pool.query(query, params);
    const events = result.rows.map(formatHistoryRow);
    const serviceBook = groupServiceBook(events);
    const tenure = calculateTenure(events, teacher);

    return successResponse(res, {
      message: "Teacher service book fetched successfully",
      data: {
        teacher,
        tenure,
        ...serviceBook,
        total_events: events.length,
      },
    });
  } catch (err) {
    console.error(err);
    return errorResponse(res, {
      message: "Error fetching teacher service book",
      error: err.message,
      status: 500,
    });
  }
};

const getTeacherTransferHistory = async (req, res) => {
  try {
    const school_id = resolveSchoolIdForWrite(req, res);
    if (school_id == null) {
      return;
    }
    const { teacherId } = req.params;

    const teacher = await verifyTeacherInSchool(pool, teacherId, school_id);
    if (!teacher) {
      return errorResponse(res, {
        message: "Teacher not found in your school",
        error: "Not found",
        status: 404,
      });
    }

    const { query, params } = buildTimelineQuery({
      schoolId: school_id,
      teacherId: Number(teacherId),
      filters: { event_types: TRANSFER_EVENT_TYPES },
    });

    const result = await pool.query(query, params);

    return successResponse(res, {
      message: "Teacher transfer history fetched successfully",
      data: {
        teacher,
        events: result.rows.map(formatHistoryRow),
      },
    });
  } catch (err) {
    console.error(err);
    return errorResponse(res, {
      message: "Error fetching teacher transfer history",
      error: err.message,
      status: 500,
    });
  }
};

const getTeacherDesignationHistory = async (req, res) => {
  try {
    const school_id = resolveSchoolIdForWrite(req, res);
    if (school_id == null) {
      return;
    }
    const { teacherId } = req.params;

    const teacher = await verifyTeacherInSchool(pool, teacherId, school_id);
    if (!teacher) {
      return errorResponse(res, {
        message: "Teacher not found in your school",
        error: "Not found",
        status: 404,
      });
    }

    const { query, params } = buildTimelineQuery({
      schoolId: school_id,
      teacherId: Number(teacherId),
      filters: { event_types: DESIGNATION_EVENT_TYPES },
    });

    const result = await pool.query(query, params);

    return successResponse(res, {
      message: "Teacher designation history fetched successfully",
      data: {
        teacher,
        events: result.rows.map(formatHistoryRow),
      },
    });
  } catch (err) {
    console.error(err);
    return errorResponse(res, {
      message: "Error fetching teacher designation history",
      error: err.message,
      status: 500,
    });
  }
};

const getTeacherTenure = async (req, res) => {
  try {
    const school_id = resolveSchoolIdForWrite(req, res);
    if (school_id == null) {
      return;
    }
    const { teacherId } = req.params;

    const teacher = await verifyTeacherInSchool(pool, teacherId, school_id);
    if (!teacher) {
      return errorResponse(res, {
        message: "Teacher not found in your school",
        error: "Not found",
        status: 404,
      });
    }

    const { query, params } = buildTimelineQuery({
      schoolId: school_id,
      teacherId: Number(teacherId),
      filters: {},
    });

    const result = await pool.query(query, params);
    const events = result.rows.map(formatHistoryRow);
    const tenure = calculateTenure(events, teacher);

    return successResponse(res, {
      message: "Teacher tenure summary fetched successfully",
      data: {
        teacher,
        tenure,
      },
    });
  } catch (err) {
    console.error(err);
    return errorResponse(res, {
      message: "Error fetching teacher tenure summary",
      error: err.message,
      status: 500,
    });
  }
};

module.exports = {
  getAssignments,
  getEventById,
  getTeacherTimeline,
  getTeacherServiceBook,
  getTeacherTransferHistory,
  getTeacherDesignationHistory,
  getTeacherTenure,
};
