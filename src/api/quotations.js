import API from "./axios";

const getAuthHeaders = () => {
  const token = localStorage.getItem("token");
  return token ? { Authorization: `Bearer ${token}` } : {};
};

export const fetchQuotationConfig = () =>
  API.get("/api/quotations/config", {
    headers: getAuthHeaders(),
  });

export const fetchQuotations = (params = {}) =>
  API.get("/api/quotations", {
    headers: getAuthHeaders(),
    params,
  });

export const fetchQuotationComparison = (expenseRequestId) =>
  API.get(`/api/quotations/expense-request/${expenseRequestId}/comparison`, {
    headers: getAuthHeaders(),
  });

export const fetchQuotationById = (id) =>
  API.get(`/api/quotations/${id}`, {
    headers: getAuthHeaders(),
  });

export const createQuotation = (formData) =>
  API.post("/api/quotations", formData, {
    headers: {
      ...getAuthHeaders(),
      "Content-Type": "multipart/form-data",
    },
  });

export const selectQuotation = (id) =>
  API.put(`/api/quotations/${id}/select`, {}, {
    headers: getAuthHeaders(),
  });
