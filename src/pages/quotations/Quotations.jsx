import { useCallback, useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { toast } from "react-toastify";
import DashboardLayout from "../../layouts/DashboardLayout";
import { fetchQuotations } from "../../api/quotations";
import {
  PageHeader,
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
  Badge,
  Button,
} from "../../design-system";

const COLUMN_WIDTHS = ["12%", "22%", "16%", "14%", "14%", "12%", "10%"];

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

function Quotations() {
  const [quotations, setQuotations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const loadQuotations = useCallback(async () => {
    setLoading(true);
    setError("");

    try {
      const response = await fetchQuotations();
      setQuotations(Array.isArray(response?.data?.data) ? response.data.data : []);
    } catch (err) {
      setQuotations([]);
      setError(err?.response?.data?.message || "Unable to load quotations.");
      toast.error(err?.response?.data?.message || "Unable to load quotations.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadQuotations();
  }, [loadQuotations]);

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <PageHeader
          title="Quotations"
          description="Vendor quotations linked to expense requests. Open a request to compare quotes and select a winner."
        />

        {error ? <Alert variant="error">{error}</Alert> : null}

        <DataTable>
          <DataTableColGroup widths={COLUMN_WIDTHS} />
          <DataTableHead>
            <DataTableRow>
              <DataTableHeaderCell>Request</DataTableHeaderCell>
              <DataTableHeaderCell>Vendor</DataTableHeaderCell>
              <DataTableHeaderCell>Contact</DataTableHeaderCell>
              <DataTableHeaderCell align="right">Amount</DataTableHeaderCell>
              <DataTableHeaderCell>Date</DataTableHeaderCell>
              <DataTableHeaderCell>Status</DataTableHeaderCell>
              <DataTableHeaderCell align="right">Open</DataTableHeaderCell>
            </DataTableRow>
          </DataTableHead>
          <DataTableBody>
            {loading ? (
              <DataTableSkeleton columns={7} rows={5} />
            ) : quotations.length === 0 ? (
              <DataTableEmpty colSpan={7} message="No quotations found." />
            ) : (
              quotations.map((quote) => (
                <DataTableRow key={quote.id}>
                  <DataTableCell>#{quote.expense_request_id}</DataTableCell>
                  <DataTableCell>{quote.vendor_name}</DataTableCell>
                  <DataTableCell>{quote.vendor_contact || "—"}</DataTableCell>
                  <DataTableCell align="right">
                    {formatCurrency(quote.quotation_amount)}
                  </DataTableCell>
                  <DataTableCell>{formatDate(quote.quotation_date)}</DataTableCell>
                  <DataTableCell>
                    {quote.is_selected ? (
                      <Badge variant="violet">Selected</Badge>
                    ) : (
                      <Badge variant="default">Uploaded</Badge>
                    )}
                  </DataTableCell>
                  <DataTableCell align="right">
                    {quote.expense_request_id ? (
                      <Link to={`/finance/expense-requests/${quote.expense_request_id}`}>
                        <Button variant="ghost">View</Button>
                      </Link>
                    ) : (
                      "—"
                    )}
                  </DataTableCell>
                </DataTableRow>
              ))
            )}
          </DataTableBody>
        </DataTable>
      </div>
    </DashboardLayout>
  );
}

export default Quotations;
