const { successResponse } = require("../utils/response");
const {
  getTeacherLinkForUser,
  linkUserToTeacher,
  unlinkUserFromTeacher,
} = require("../services/teacherIdentityService");
const { resolveSchoolScope } = require("../utils/tenantScope");

const getUserTeacherLink = async (req, res) => {
  const scope = resolveSchoolScope(req, res);
  if (!scope) {
    return;
  }

  const userId = Number(req.params.userId);
  const data = await getTeacherLinkForUser(userId, {
    role: scope.role,
    schoolId: scope.schoolId,
  });

  return successResponse(res, {
    message: "User teacher link fetched successfully",
    data,
  });
};

const putUserTeacherLink = async (req, res) => {
  const scope = resolveSchoolScope(req, res);
  if (!scope) {
    return;
  }

  const userId = Number(req.params.userId);
  const teacherId = Number(req.body.teacher_id);

  const data = await linkUserToTeacher(userId, teacherId, {
    role: scope.role,
    schoolId: scope.schoolId,
  });

  return successResponse(res, {
    message: "User linked to teacher successfully",
    data,
  });
};

const deleteUserTeacherLink = async (req, res) => {
  const scope = resolveSchoolScope(req, res);
  if (!scope) {
    return;
  }

  const userId = Number(req.params.userId);
  const data = await unlinkUserFromTeacher(userId, {
    role: scope.role,
    schoolId: scope.schoolId,
  });

  return successResponse(res, {
    message: "User unlinked from teacher successfully",
    data,
  });
};

module.exports = {
  getUserTeacherLink,
  putUserTeacherLink,
  deleteUserTeacherLink,
};
