import API from "./axios";
import { getAuthRole } from "../utils/auth";

export { getAuthRole };

const getAuthHeaders = () => {
  const token = localStorage.getItem("token");
  return token ? { Authorization: `Bearer ${token}` } : {};
};

export const fetchFinancialYears = (params = {}) =>
  API.get("/api/financial-years", {
    headers: getAuthHeaders(),
    params,
  });

export const fetchActiveFinancialYear = () =>
  API.get("/api/financial-years/active", {
    headers: getAuthHeaders(),
  });

export const fetchFinancialYearById = (id) =>
  API.get(`/api/financial-years/${id}`, {
    headers: getAuthHeaders(),
  });

export const createFinancialYear = (payload) =>
  API.post("/api/financial-years", payload, {
    headers: getAuthHeaders(),
  });

export const updateFinancialYear = (id, payload) =>
  API.put(`/api/financial-years/${id}`, payload, {
    headers: getAuthHeaders(),
  });

export const activateFinancialYear = (id) =>
  API.put(`/api/financial-years/${id}/activate`, {}, {
    headers: getAuthHeaders(),
  });

export const closeFinancialYear = (id) =>
  API.put(`/api/financial-years/${id}/close`, {}, {
    headers: getAuthHeaders(),
  });

export const deleteFinancialYear = (id) =>
  API.delete(`/api/financial-years/${id}`, {
    headers: getAuthHeaders(),
  });

// ——— Budget Heads (parent) ———

export const fetchBudgetHeads = (params = {}) =>
  API.get("/api/budget-heads", {
    headers: getAuthHeaders(),
    params,
  });

export const fetchBudgetHeadById = (id) =>
  API.get(`/api/budget-heads/${id}`, {
    headers: getAuthHeaders(),
  });

export const createBudgetHead = (payload) =>
  API.post("/api/budget-heads", payload, {
    headers: getAuthHeaders(),
  });

export const updateBudgetHead = (id, payload) =>
  API.put(`/api/budget-heads/${id}`, payload, {
    headers: getAuthHeaders(),
  });

export const updateBudgetHeadStatus = (id, isActive) =>
  API.put(
    `/api/budget-heads/${id}/status`,
    { is_active: isActive },
    { headers: getAuthHeaders() }
  );

// ——— Budget Sub Heads ———

export const fetchBudgetSubHeads = (params = {}) =>
  API.get("/api/budget-sub-heads", {
    headers: getAuthHeaders(),
    params,
  });

export const fetchBudgetSubHeadById = (id) =>
  API.get(`/api/budget-sub-heads/${id}`, {
    headers: getAuthHeaders(),
  });

export const createBudgetSubHead = (payload) =>
  API.post("/api/budget-sub-heads", payload, {
    headers: getAuthHeaders(),
  });

export const updateBudgetSubHead = (id, payload) =>
  API.put(`/api/budget-sub-heads/${id}`, payload, {
    headers: getAuthHeaders(),
  });

export const updateBudgetSubHeadStatus = (id, isActive) =>
  API.put(
    `/api/budget-sub-heads/${id}/status`,
    { is_active: isActive },
    { headers: getAuthHeaders() }
  );

// ——— Budget Allocations ———

export const fetchBudgetAllocations = (params = {}) =>
  API.get("/api/budget-allocations", {
    headers: getAuthHeaders(),
    params,
  });

export const fetchBudgetAllocationSummary = (params = {}) =>
  API.get("/api/budget-allocations/summary", {
    headers: getAuthHeaders(),
    params,
  });

export const fetchBudgetAllocationById = (id) =>
  API.get(`/api/budget-allocations/${id}`, {
    headers: getAuthHeaders(),
  });

export const createBudgetAllocation = (payload) =>
  API.post("/api/budget-allocations", payload, {
    headers: getAuthHeaders(),
  });

export const updateBudgetAllocation = (id, payload) =>
  API.put(`/api/budget-allocations/${id}`, payload, {
    headers: getAuthHeaders(),
  });

export const updateBudgetAllocationStatus = (id, isActive) =>
  API.put(
    `/api/budget-allocations/${id}/status`,
    { is_active: isActive },
    { headers: getAuthHeaders() }
  );

// ——— Expense Requests ———

export const fetchExpenseRequests = (params = {}) =>
  API.get("/api/expense-requests", {
    headers: getAuthHeaders(),
    params,
  });

export const fetchExpenseRequestSummary = (params = {}) =>
  API.get("/api/expense-requests/summary", {
    headers: getAuthHeaders(),
    params,
  });

export const fetchAllocationBalance = (allocationId) =>
  API.get(`/api/expense-requests/allocation/${allocationId}/balance`, {
    headers: getAuthHeaders(),
  });

export const fetchExpenseRequestById = (id) =>
  API.get(`/api/expense-requests/${id}`, {
    headers: getAuthHeaders(),
  });

export const createExpenseRequest = (payload) =>
  API.post("/api/expense-requests", payload, {
    headers: getAuthHeaders(),
  });

export const updateExpenseRequest = (id, payload) =>
  API.put(`/api/expense-requests/${id}`, payload, {
    headers: getAuthHeaders(),
  });

export const deleteExpenseRequest = (id) =>
  API.delete(`/api/expense-requests/${id}`, {
    headers: getAuthHeaders(),
  });

export const submitExpenseRequest = (id) =>
  API.put(`/api/expense-requests/${id}/submit`, {}, {
    headers: getAuthHeaders(),
  });

export const approveExpenseRequest = (id) =>
  API.put(`/api/expense-requests/${id}/approve`, {}, {
    headers: getAuthHeaders(),
  });

export const rejectExpenseRequest = (id, payload) =>
  API.put(`/api/expense-requests/${id}/reject`, payload, {
    headers: getAuthHeaders(),
  });

export const markExpenseRequestPaid = (id, payload) =>
  API.put(`/api/expense-requests/${id}/mark-paid`, payload, {
    headers: getAuthHeaders(),
  });

// ——— Cashbook V2 ———

export const fetchCashbookEntries = (params = {}) =>
  API.get("/api/finance/cashbook", {
    headers: getAuthHeaders(),
    params,
  });

export const fetchCashbookSummary = (params = {}) =>
  API.get("/api/finance/cashbook/summary", {
    headers: getAuthHeaders(),
    params,
  });

export const fetchCashbookEntryById = (id) =>
  API.get(`/api/finance/cashbook/${id}`, {
    headers: getAuthHeaders(),
  });

export const exportCashbookXlsx = (params = {}) =>
  API.get("/api/finance/cashbook/export", {
    headers: getAuthHeaders(),
    params,
    responseType: "blob",
  });

export const fetchFinanceDashboardMetrics = (params = {}) =>
  API.get("/api/dashboard/finance", {
    headers: getAuthHeaders(),
    params,
  });
