import { useCallback, useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { toast } from "react-toastify";
import API from "../../api/axios";
import DashboardLayout from "../../layouts/DashboardLayout";
import {
  createStockEntry,
  createStockIssue,
  fetchStockConfig,
  fetchStockDashboard,
  fetchStockEntries,
} from "../../api/stock";
import { fetchActivities } from "../../api/activities";
import {
  PageHeader,
  MetricGrid,
  MetricCard,
  FilterToolbar,
  FilterSelect,
  Button,
  Alert,
  DataTable,
  DataTableColGroup,
  DataTableHead,
  DataTableBody,
  DataTableRow,
  DataTableHeaderCell,
  DataTableCell,
  DataTableEmpty,
  DataTableSkeleton,
  ErpModal,
  FormField,
  Input,
  Select,
  FormActions,
  Badge,
} from "../../design-system";

const ENTRY_COLUMN_WIDTHS = ["16%", "12%", "10%", "8%", "8%", "10%", "10%", "10%", "8%", "8%"];

const formatCurrency = (value) => {
  const amount = Number(value);
  if (Number.isNaN(amount)) return "—";

  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(amount);
};

const formatDate = (value) => {
  if (!value) return "—";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleDateString("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
};

const emptyEntryForm = {
  item_name: "",
  category: "",
  quantity: "",
  unit: "pcs",
  purchase_rate: "",
  vendor_name: "",
  purchase_date: new Date().toISOString().slice(0, 10),
};

const emptyIssueForm = {
  stock_entry_id: "",
  issued_quantity: "",
  issue_type: "teacher",
  issued_to_teacher_id: "",
  issued_to_activity_id: "",
  issued_to_department: "",
  issue_date: new Date().toISOString().slice(0, 10),
  remarks: "",
};

function StockRegister() {
  const [config, setConfig] = useState({ categories: [], low_stock_threshold: 5 });
  const [dashboard, setDashboard] = useState(null);
  const [entries, setEntries] = useState([]);
  const [teachers, setTeachers] = useState([]);
  const [activities, setActivities] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("");
  const [lowStockFilter, setLowStockFilter] = useState("");
  const [entryModalOpen, setEntryModalOpen] = useState(false);
  const [issueModalOpen, setIssueModalOpen] = useState(false);
  const [entryForm, setEntryForm] = useState(emptyEntryForm);
  const [issueForm, setIssueForm] = useState(emptyIssueForm);
  const [isSaving, setIsSaving] = useState(false);

  const categoryOptions = useMemo(
    () => [
      { value: "", label: "All categories" },
      ...(config.categories || []).map((row) => ({
        value: row.value,
        label: row.label,
      })),
    ],
    [config.categories]
  );

  const loadData = useCallback(async () => {
    setLoading(true);
    setError("");

    try {
      const params = {
        category: categoryFilter || undefined,
        low_stock: lowStockFilter === "true" ? "true" : undefined,
      };

      const [configResponse, dashboardResponse, entriesResponse, teachersResponse, activitiesResponse] =
        await Promise.all([
          fetchStockConfig(),
          fetchStockDashboard(),
          fetchStockEntries(params),
          API.get("/api/teachers", {
            headers: { Authorization: `Bearer ${localStorage.getItem("token")}` },
            params: { limit: 200 },
          }),
          fetchActivities(),
        ]);

      setConfig(configResponse?.data?.data || { categories: [], low_stock_threshold: 5 });
      setDashboard(dashboardResponse?.data?.data || null);
      setEntries(Array.isArray(entriesResponse?.data?.data) ? entriesResponse.data.data : []);
      setTeachers(teachersResponse?.data?.data?.teachers || teachersResponse?.data?.data || []);
      setActivities(Array.isArray(activitiesResponse?.data?.data) ? activitiesResponse.data.data : []);
    } catch (err) {
      setError(err?.response?.data?.message || "Unable to load stock register.");
      setEntries([]);
      setDashboard(null);
    } finally {
      setLoading(false);
    }
  }, [categoryFilter, lowStockFilter]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const openIssueModal = (entry) => {
    setIssueForm({
      ...emptyIssueForm,
      stock_entry_id: String(entry.id),
      issued_quantity: "",
    });
    setIssueModalOpen(true);
  };

  const handleEntryInputChange = (event) => {
    const { name, value } = event.target;
    setEntryForm((prev) => ({ ...prev, [name]: value }));
  };

  const handleIssueInputChange = (event) => {
    const { name, value } = event.target;
    setIssueForm((prev) => ({ ...prev, [name]: value }));
  };

  const handleCreateEntry = async (event) => {
    event.preventDefault();
    setIsSaving(true);

    try {
      await createStockEntry({
        item_name: entryForm.item_name.trim(),
        category: entryForm.category,
        quantity: Number(entryForm.quantity),
        unit: entryForm.unit.trim(),
        purchase_rate: Number(entryForm.purchase_rate),
        vendor_name: entryForm.vendor_name.trim() || undefined,
        purchase_date: entryForm.purchase_date,
      });
      toast.success("Stock entry created");
      setEntryModalOpen(false);
      setEntryForm(emptyEntryForm);
      await loadData();
    } catch (err) {
      toast.error(err?.response?.data?.message || "Unable to create stock entry.");
    } finally {
      setIsSaving(false);
    }
  };

  const handleIssueStock = async (event) => {
    event.preventDefault();
    setIsSaving(true);

    try {
      await createStockIssue({
        stock_entry_id: Number(issueForm.stock_entry_id),
        issued_quantity: Number(issueForm.issued_quantity),
        issue_type: issueForm.issue_type,
        issued_to_teacher_id:
          issueForm.issue_type === "teacher"
            ? Number(issueForm.issued_to_teacher_id)
            : undefined,
        issued_to_activity_id:
          issueForm.issue_type === "activity"
            ? Number(issueForm.issued_to_activity_id)
            : undefined,
        issued_to_department:
          issueForm.issue_type === "department"
            ? issueForm.issued_to_department.trim()
            : undefined,
        issue_date: issueForm.issue_date,
        remarks: issueForm.remarks.trim() || undefined,
      });
      toast.success("Stock issued");
      setIssueModalOpen(false);
      setIssueForm(emptyIssueForm);
      await loadData();
    } catch (err) {
      toast.error(err?.response?.data?.message || "Unable to issue stock.");
    } finally {
      setIsSaving(false);
    }
  };

  const recentIssues = dashboard?.recent_issues || [];

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <PageHeader
          title="Stock Register"
          description="Track purchased inventory, issue items to teachers or activities, and monitor stock balances."
          actions={
            <div className="flex flex-wrap gap-2">
              <Button variant="secondary" onClick={() => setEntryModalOpen(true)}>
                Add Stock Entry
              </Button>
            </div>
          }
        />

        {error ? <Alert variant="error">{error}</Alert> : null}

        <MetricGrid columns={4}>
          <MetricCard label="Total Items" value={dashboard?.total_items ?? 0} />
          <MetricCard
            label="Total Value"
            value={formatCurrency(dashboard?.total_value ?? 0)}
            accent="emerald"
          />
          <MetricCard
            label="Low Stock Items"
            value={dashboard?.low_stock_count ?? 0}
            accent="amber"
          />
          <MetricCard
            label="Low Stock Threshold"
            value={dashboard?.low_stock_threshold ?? config.low_stock_threshold}
          />
        </MetricGrid>

        <FilterToolbar>
          <FilterSelect
            value={categoryFilter}
            onChange={(event) => setCategoryFilter(event.target.value)}
            options={categoryOptions}
          />
          <FilterSelect
            value={lowStockFilter}
            onChange={(event) => setLowStockFilter(event.target.value)}
            options={[
              { value: "", label: "All stock levels" },
              { value: "true", label: "Low stock only" },
            ]}
          />
        </FilterToolbar>

        <DataTable>
          <DataTableColGroup widths={ENTRY_COLUMN_WIDTHS} />
          <DataTableHead>
            <DataTableRow>
              <DataTableHeaderCell>Item</DataTableHeaderCell>
              <DataTableHeaderCell>Category</DataTableHeaderCell>
              <DataTableHeaderCell align="right">Received</DataTableHeaderCell>
              <DataTableHeaderCell align="right">Issued</DataTableHeaderCell>
              <DataTableHeaderCell align="right">Available</DataTableHeaderCell>
              <DataTableHeaderCell>Unit</DataTableHeaderCell>
              <DataTableHeaderCell align="right">Rate</DataTableHeaderCell>
              <DataTableHeaderCell>Vendor</DataTableHeaderCell>
              <DataTableHeaderCell>Purchased</DataTableHeaderCell>
              <DataTableHeaderCell align="right">Actions</DataTableHeaderCell>
            </DataTableRow>
          </DataTableHead>
          <DataTableBody>
            {loading ? (
              <DataTableSkeleton columns={10} rows={5} />
            ) : entries.length === 0 ? (
              <DataTableEmpty colSpan={10} message="No stock entries found." />
            ) : (
              entries.map((entry) => (
                <DataTableRow key={entry.id}>
                  <DataTableCell>
                    <div className="font-semibold text-slate-100">{entry.item_name}</div>
                    {entry.expense_request_id ? (
                      <Link
                        to={`/finance/expense-requests/${entry.expense_request_id}`}
                        className="text-xs text-sky-400 hover:underline"
                      >
                        ER #{entry.expense_request_id}
                      </Link>
                    ) : null}
                  </DataTableCell>
                  <DataTableCell>{entry.category_label || entry.category}</DataTableCell>
                  <DataTableCell align="right">{entry.quantity}</DataTableCell>
                  <DataTableCell align="right">{entry.issued_quantity}</DataTableCell>
                  <DataTableCell align="right">
                    <div className="flex items-center justify-end gap-2">
                      {entry.is_low_stock ? <Badge variant="amber">Low</Badge> : null}
                      <span>{entry.available_quantity}</span>
                    </div>
                  </DataTableCell>
                  <DataTableCell>{entry.unit}</DataTableCell>
                  <DataTableCell align="right">{formatCurrency(entry.purchase_rate)}</DataTableCell>
                  <DataTableCell>{entry.vendor_name || "—"}</DataTableCell>
                  <DataTableCell>{formatDate(entry.purchase_date)}</DataTableCell>
                  <DataTableCell align="right">
                    {entry.available_quantity > 0 ? (
                      <Button variant="ghost" onClick={() => openIssueModal(entry)}>
                        Issue
                      </Button>
                    ) : (
                      "—"
                    )}
                  </DataTableCell>
                </DataTableRow>
              ))
            )}
          </DataTableBody>
        </DataTable>

        <div className="space-y-3">
          <h3 className="text-base font-semibold text-slate-100">Recent Issues</h3>
          <DataTable>
            <DataTableColGroup widths={["18%", "14%", "12%", "18%", "14%", "14%", "10%"]} />
            <DataTableHead>
              <DataTableRow>
                <DataTableHeaderCell>Item</DataTableHeaderCell>
                <DataTableHeaderCell align="right">Qty</DataTableHeaderCell>
                <DataTableHeaderCell>Type</DataTableHeaderCell>
                <DataTableHeaderCell>Issued To</DataTableHeaderCell>
                <DataTableHeaderCell>Date</DataTableHeaderCell>
                <DataTableHeaderCell>By</DataTableHeaderCell>
                <DataTableHeaderCell>Remarks</DataTableHeaderCell>
              </DataTableRow>
            </DataTableHead>
            <DataTableBody>
              {recentIssues.length === 0 ? (
                <DataTableEmpty colSpan={7} message="No stock issues recorded yet." />
              ) : (
                recentIssues.map((issue) => (
                  <DataTableRow key={issue.id}>
                    <DataTableCell>{issue.item_name}</DataTableCell>
                    <DataTableCell align="right">{issue.issued_quantity}</DataTableCell>
                    <DataTableCell className="capitalize">{issue.issue_type}</DataTableCell>
                    <DataTableCell>{issue.issued_to || "—"}</DataTableCell>
                    <DataTableCell>{formatDate(issue.issue_date)}</DataTableCell>
                    <DataTableCell>{issue.created_by_name || "—"}</DataTableCell>
                    <DataTableCell>{issue.remarks || "—"}</DataTableCell>
                  </DataTableRow>
                ))
              )}
            </DataTableBody>
          </DataTable>
        </div>
      </div>

      <ErpModal
        isOpen={entryModalOpen}
        onClose={() => setEntryModalOpen(false)}
        title="Add Stock Entry"
      >
        <form onSubmit={handleCreateEntry} className="space-y-4">
          <FormField label="Item Name">
            <Input name="item_name" value={entryForm.item_name} onChange={handleEntryInputChange} required />
          </FormField>
          <FormField label="Category">
            <Select name="category" value={entryForm.category} onChange={handleEntryInputChange} required>
              <option value="">Select category</option>
              {(config.categories || []).map((row) => (
                <option key={row.value} value={row.value}>
                  {row.label}
                </option>
              ))}
            </Select>
          </FormField>
          <FormField label="Quantity">
            <Input
              name="quantity"
              type="number"
              min="0.01"
              step="0.01"
              value={entryForm.quantity}
              onChange={handleEntryInputChange}
              required
            />
          </FormField>
          <FormField label="Unit">
            <Input name="unit" value={entryForm.unit} onChange={handleEntryInputChange} required />
          </FormField>
          <FormField label="Purchase Rate (INR)">
            <Input
              name="purchase_rate"
              type="number"
              min="0.01"
              step="0.01"
              value={entryForm.purchase_rate}
              onChange={handleEntryInputChange}
              required
            />
          </FormField>
          <FormField label="Vendor">
            <Input name="vendor_name" value={entryForm.vendor_name} onChange={handleEntryInputChange} />
          </FormField>
          <FormField label="Purchase Date">
            <Input
              name="purchase_date"
              type="date"
              value={entryForm.purchase_date}
              onChange={handleEntryInputChange}
              required
            />
          </FormField>
          <FormActions>
            <Button type="button" variant="ghost" onClick={() => setEntryModalOpen(false)}>
              Cancel
            </Button>
            <Button type="submit" variant="primary" disabled={isSaving}>
              Save Entry
            </Button>
          </FormActions>
        </form>
      </ErpModal>

      <ErpModal isOpen={issueModalOpen} onClose={() => setIssueModalOpen(false)} title="Issue Stock">
        <form onSubmit={handleIssueStock} className="space-y-4">
          <FormField label="Issue Type">
            <Select name="issue_type" value={issueForm.issue_type} onChange={handleIssueInputChange}>
              <option value="teacher">Teacher</option>
              <option value="activity">Activity</option>
              <option value="department">Department</option>
            </Select>
          </FormField>

          {issueForm.issue_type === "teacher" ? (
            <FormField label="Teacher">
              <Select
                name="issued_to_teacher_id"
                value={issueForm.issued_to_teacher_id}
                onChange={handleIssueInputChange}
                required
              >
                <option value="">Select teacher</option>
                {teachers.map((teacher) => (
                  <option key={teacher.id} value={teacher.id}>
                    {teacher.teacher_name || teacher.name}
                  </option>
                ))}
              </Select>
            </FormField>
          ) : null}

          {issueForm.issue_type === "activity" ? (
            <FormField label="Activity">
              <Select
                name="issued_to_activity_id"
                value={issueForm.issued_to_activity_id}
                onChange={handleIssueInputChange}
                required
              >
                <option value="">Select activity</option>
                {activities.map((activity) => (
                  <option key={activity.id} value={activity.id}>
                    {activity.activity_name}
                  </option>
                ))}
              </Select>
            </FormField>
          ) : null}

          {issueForm.issue_type === "department" ? (
            <FormField label="Department">
              <Input
                name="issued_to_department"
                value={issueForm.issued_to_department}
                onChange={handleIssueInputChange}
                required
              />
            </FormField>
          ) : null}

          <FormField label="Issued Quantity">
            <Input
              name="issued_quantity"
              type="number"
              min="0.01"
              step="0.01"
              value={issueForm.issued_quantity}
              onChange={handleIssueInputChange}
              required
            />
          </FormField>
          <FormField label="Issue Date">
            <Input
              name="issue_date"
              type="date"
              value={issueForm.issue_date}
              onChange={handleIssueInputChange}
              required
            />
          </FormField>
          <FormField label="Remarks">
            <Input name="remarks" value={issueForm.remarks} onChange={handleIssueInputChange} />
          </FormField>
          <FormActions>
            <Button type="button" variant="ghost" onClick={() => setIssueModalOpen(false)}>
              Cancel
            </Button>
            <Button type="submit" variant="primary" disabled={isSaving}>
              Issue Stock
            </Button>
          </FormActions>
        </form>
      </ErpModal>
    </DashboardLayout>
  );
}

export default StockRegister;
