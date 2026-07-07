import API from "./axios";

const getAuthHeaders = () => {
  const token = localStorage.getItem("token");
  return token ? { Authorization: `Bearer ${token}` } : {};
};

export const fetchActivities = (params = {}) =>
  API.get("/api/activities", {
    headers: getAuthHeaders(),
    params,
  });

export const fetchActivityDashboard = (params = {}) =>
  API.get("/api/activities/dashboard", {
    headers: getAuthHeaders(),
    params,
  });

export const fetchActivityById = (id) =>
  API.get(`/api/activities/${id}`, {
    headers: getAuthHeaders(),
  });

export const fetchActivityTimeline = (id) =>
  API.get(`/api/activities/${id}/timeline`, {
    headers: getAuthHeaders(),
  });

export const createActivity = (payload) =>
  API.post("/api/activities", payload, {
    headers: getAuthHeaders(),
  });

export const updateActivity = (id, payload) =>
  API.put(`/api/activities/${id}`, payload, {
    headers: getAuthHeaders(),
  });

export const fetchActivityAllocationAvailability = (allocationId, params = {}) =>
  API.get(`/api/activities/allocation/${allocationId}/budget-availability`, {
    headers: getAuthHeaders(),
    params,
  });

export const submitActivity = (id) =>
  API.put(`/api/activities/${id}/submit`, {}, {
    headers: getAuthHeaders(),
  });

export const approveActivity = (id) =>
  API.put(`/api/activities/${id}/approve`, {}, {
    headers: getAuthHeaders(),
  });

export const rejectActivity = (id, payload) =>
  API.put(`/api/activities/${id}/reject`, payload, {
    headers: getAuthHeaders(),
  });

export const completeActivity = (id) =>
  API.put(`/api/activities/${id}/complete`, {}, {
    headers: getAuthHeaders(),
  });
