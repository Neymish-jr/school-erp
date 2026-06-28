import API from "./axios";

export const fetchCharges = (params = {}) =>
  API.get("/api/administrative-charges", { params });

export const fetchChargeDetails = (id) =>
  API.get(`/api/administrative-charges/${id}/details`);

export const assignCharge = (payload) =>
  API.post("/api/teacher-administrative-charge-assignments", payload);

export const relieveChargeAssignment = (assignmentId) =>
  API.put(`/api/teacher-administrative-charge-assignments/${assignmentId}/relieve`);
