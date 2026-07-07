import { useState, useEffect, useMemo } from "react";
import { Icon } from "@iconify/react";
import API from "../../api/axios";
import { toast } from "react-toastify";
import DashboardLayout from "../../layouts/DashboardLayout";
import { usePermissions } from "../../hooks/usePermissions";
import {
  PageHeader,
  MetricGrid,
  MetricCard,
  FilterToolbar,
  FilterSearch,
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
  DataTableFooter,
  TablePagination,
  ErpModal,
  FormField,
  Input,
  Select,
  FormGrid,
  FormActions,
  Badge,
  VacancyCell,
  erp,
} from "../../design-system";
import Permission from "../../components/Permission";

const STAFF_POSTS_PAGE_LIMIT = 1000;
const CLIENT_PAGE_SIZE = 10;

const STAFF_POSTS_COLUMN_WIDTHS = [
  "25%",
  "10%",
  "15%",
  "15%",
  "10%",
  "10%",
  "10%",
  "5%",
];

const STAFF_CATEGORY_OPTIONS = [
  { value: "", label: "All categories" },
  { value: "Teaching", label: "Teaching" },
  { value: "Administrative", label: "Administrative" },
  { value: "Office", label: "Office" },
  { value: "Support", label: "Support" },
  { value: "Contractual", label: "Contractual" },
];

const getAuthHeaders = () => {
  const token = localStorage.getItem("token");
  return token ? { Authorization: `Bearer ${token}` } : {};
};

const enrichStaffPostsWithVacancy = (posts, assignments) => {
  const filledCountByPostId = {};

  assignments.forEach((assignment) => {
    if (!assignment.staff_post_id) return;
    if (assignment.teacher_status && assignment.teacher_status !== "active") {
      return;
    }
    filledCountByPostId[assignment.staff_post_id] =
      (filledCountByPostId[assignment.staff_post_id] || 0) + 1;
  });

  return posts.map((post) => {
    const filled = filledCountByPostId[post.id] || 0;
    const sanctioned = Number(post.sanctioned_count) || 0;
    const vacant = Math.max(0, sanctioned - filled);

    return {
      ...post,
      filled,
      vacant,
    };
  });
};

const fetchAllStaffPosts = async (search, filterCategory) => {
  const firstResponse = await API.get("/api/staff-posts", {
    headers: getAuthHeaders(),
    params: {
      search,
      staff_category: filterCategory,
      page: 1,
      limit: STAFF_POSTS_PAGE_LIMIT,
    },
  });

  const firstPayload = firstResponse?.data || {};
  const limit = Number(firstPayload.limit) || STAFF_POSTS_PAGE_LIMIT;
  const total = Number(firstPayload.total) || 0;
  const totalPages = Math.max(1, Math.ceil(total / limit));

  let allPosts = Array.isArray(firstPayload.data) ? firstPayload.data : [];

  if (totalPages > 1) {
    const otherPages = await Promise.all(
      Array.from({ length: totalPages - 1 }, (_, index) =>
        API.get("/api/staff-posts", {
          headers: getAuthHeaders(),
          params: {
            search,
            staff_category: filterCategory,
            page: index + 2,
            limit: STAFF_POSTS_PAGE_LIMIT,
          },
        })
      )
    );

    allPosts = [
      ...allPosts,
      ...otherPages.flatMap((response) =>
        Array.isArray(response?.data?.data) ? response.data.data : []
      ),
    ];
  }

  return allPosts;
};

const StaffPosts = () => {
  const { can, canAny } = usePermissions();
  const canCreatePost = can("staff_post.create");
  const canUpdatePost = can("staff_post.update");
  const canDeletePost = can("staff_post.delete");
  const showActionsColumn = canAny(["staff_post.update", "staff_post.delete"]);

  const [staffPosts, setStaffPosts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [assignmentsWarning, setAssignmentsWarning] = useState("");
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [currentPost, setCurrentPost] = useState(null);
  const [formData, setFormData] = useState({
    post_name: "",
    post_code: "",
    staff_category: "Teaching",
    appointment_nature: "Permanent",
    sanctioned_count: 0,
  });
  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [filterCategory, setFilterCategory] = useState("");
  const [page, setPage] = useState(1);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      setDebouncedSearch(search.trim());
    }, 300);

    return () => window.clearTimeout(timer);
  }, [search]);

  useEffect(() => {
    fetchStaffPosts();
  }, [debouncedSearch, filterCategory]);

  useEffect(() => {
    setPage(1);
  }, [debouncedSearch, filterCategory]);

  const fetchStaffPosts = async () => {
    setLoading(true);
    setError(null);
    setAssignmentsWarning("");

    try {
      const [allPosts, assignmentsResult] = await Promise.all([
        fetchAllStaffPosts(debouncedSearch, filterCategory),
        API.get("/api/teacher-staff-post-assignments", {
          headers: getAuthHeaders(),
          params: { is_active: "true" },
        }).catch((assignmentsErr) => {
          console.error("Failed to fetch staff post assignments", assignmentsErr);
          setAssignmentsWarning(
            "Filled and vacant counts could not be loaded. Post data is still shown."
          );
          return null;
        }),
      ]);

      const activeAssignments = assignmentsResult?.data?.data || [];
      setStaffPosts(enrichStaffPostsWithVacancy(allPosts, activeAssignments));
    } catch (err) {
      setStaffPosts([]);
      setError(err?.response?.data?.message || err.message);
      toast.error("Failed to fetch staff posts");
    } finally {
      setLoading(false);
    }
  };

  const metrics = useMemo(() => {
    const totalPosts = staffPosts.length;
    const totalSanctioned = staffPosts.reduce(
      (sum, post) => sum + (Number(post.sanctioned_count) || 0),
      0
    );
    const totalFilled = staffPosts.reduce((sum, post) => sum + (post.filled || 0), 0);
    const totalVacant = staffPosts.reduce((sum, post) => sum + (post.vacant || 0), 0);

    return { totalPosts, totalSanctioned, totalFilled, totalVacant };
  }, [staffPosts]);

  const totalPages = Math.max(1, Math.ceil(staffPosts.length / CLIENT_PAGE_SIZE));

  useEffect(() => {
    if (page > totalPages) {
      setPage(totalPages);
    }
  }, [page, totalPages]);

  const visiblePosts = staffPosts.slice((page - 1) * CLIENT_PAGE_SIZE, page * CLIENT_PAGE_SIZE);

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }));
  };

  const handleCreateEdit = async (e) => {
    e.preventDefault();
    try {
      if (currentPost) {
        await API.put(`/api/staff-posts/${currentPost.id}`, formData, {
          headers: getAuthHeaders(),
        });
        toast.success("Staff post updated successfully");
      } else {
        await API.post("/api/staff-posts", formData, {
          headers: getAuthHeaders(),
        });
        toast.success("Staff post created successfully");
      }
      fetchStaffPosts();
      setIsModalOpen(false);
      setCurrentPost(null);
      setFormData({
        post_name: "",
        post_code: "",
        staff_category: "Teaching",
        appointment_nature: "Permanent",
        sanctioned_count: 0,
      });
    } catch (err) {
      toast.error(err.response?.data?.message || "Failed to save staff post");
    }
  };

  const handleDelete = async (id) => {
    if (window.confirm("Are you sure you want to delete this staff post?")) {
      try {
        await API.delete(`/api/staff-posts/${id}`, {
          headers: getAuthHeaders(),
        });
        toast.success("Staff post deleted successfully");
        fetchStaffPosts();
      } catch (err) {
        toast.error("Failed to delete staff post");
      }
    }
  };

  const openCreateModal = () => {
    setCurrentPost(null);
    setFormData({
      post_name: "",
      post_code: "",
      staff_category: "Teaching",
      appointment_nature: "Permanent",
      sanctioned_count: 0,
    });
    setIsModalOpen(true);
  };

  const openEditModal = (post) => {
    setCurrentPost(post);
    setFormData({
      post_name: post.post_name,
      post_code: post.post_code || "",
      staff_category: post.staff_category,
      appointment_nature: post.appointment_nature || "Permanent",
      sanctioned_count: post.sanctioned_count,
    });
    setIsModalOpen(true);
  };

  const resetFilters = () => {
    setSearch("");
    setFilterCategory("");
    setPage(1);
  };

  const categoryBadgeVariant = (category) => {
    const map = {
      Teaching: "orange",
      Administrative: "amber",
      Office: "default",
      Support: "amber",
      Contractual: "rose",
    };
    return map[category] || "default";
  };

  return (
    <DashboardLayout>
      <div className={erp.page}>
        <PageHeader
          eyebrow="Staff Management"
          title="Staff Posts"
          description="Manage sanctioned designations, track filled and vacant positions, and maintain government staffing records."
          actions={
            canCreatePost ? (
              <Button onClick={openCreateModal}>
                <Icon icon="mdi:briefcase-plus-outline" className="h-4 w-4" />
                Add Staff Post
              </Button>
            ) : null
          }
        />

        <MetricGrid columns={4}>
          <MetricCard
            label="Total Posts"
            value={loading ? "…" : metrics.totalPosts}
            hint="Designation categories"
            accent="orange"
          />
          <MetricCard
            label="Sanctioned Strength"
            value={loading ? "…" : metrics.totalSanctioned}
            hint="Approved headcount"
            accent="amber"
          />
          <MetricCard
            label="Filled Positions"
            value={loading || assignmentsWarning ? "…" : metrics.totalFilled}
            hint="Active assignments"
            accent="emerald"
          />
          <MetricCard
            label="Vacant Positions"
            value={loading || assignmentsWarning ? "…" : metrics.totalVacant}
            hint="Available slots"
            accent="amber"
          />
        </MetricGrid>

        <FilterToolbar title="Search & filter" onReset={resetFilters}>
          <FilterSearch
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search by post name or code…"
          />
          <FilterSelect
            value={filterCategory}
            onChange={(e) => setFilterCategory(e.target.value)}
            options={STAFF_CATEGORY_OPTIONS}
            aria-label="Filter by staff category"
          />
        </FilterToolbar>

        {error ? <Alert variant="error">{error}</Alert> : null}
        {assignmentsWarning ? <Alert variant="warning">{assignmentsWarning}</Alert> : null}

        <DataTable
          fixedLayout
          footer={
            !loading && staffPosts.length > 0 ? (
              <DataTableFooter>
                <TablePagination
                  page={page}
                  totalPages={totalPages}
                  totalItems={staffPosts.length}
                  pageSize={CLIENT_PAGE_SIZE}
                  onPageChange={setPage}
                  isLoading={loading}
                />
              </DataTableFooter>
            ) : null
          }
        >
          <DataTableColGroup widths={STAFF_POSTS_COLUMN_WIDTHS} />
          <DataTableHead>
            <DataTableRow>
              <DataTableHeaderCell width="25%">Designation</DataTableHeaderCell>
              <DataTableHeaderCell align="center" width="10%">
                Post Code
              </DataTableHeaderCell>
              <DataTableHeaderCell align="center" width="15%">
                Category
              </DataTableHeaderCell>
              <DataTableHeaderCell align="center" width="15%">
                Appointment
              </DataTableHeaderCell>
              <DataTableHeaderCell align="center" width="10%">
                Sanctioned
              </DataTableHeaderCell>
              <DataTableHeaderCell align="center" width="10%">
                Filled
              </DataTableHeaderCell>
              <DataTableHeaderCell align="center" width="10%">
                Vacant
              </DataTableHeaderCell>
              {showActionsColumn ? (
                <DataTableHeaderCell align="center" width="5%">
                  Actions
                </DataTableHeaderCell>
              ) : null}
            </DataTableRow>
          </DataTableHead>
          <DataTableBody>
            {loading ? (
              <DataTableSkeleton rows={6} cols={showActionsColumn ? 8 : 7} />
            ) : visiblePosts.length === 0 ? (
              <DataTableEmpty colSpan={showActionsColumn ? 8 : 7} message="No staff posts found." />
            ) : (
              visiblePosts.map((post) => (
                <DataTableRow key={post.id}>
                  <DataTableCell width="25%" className="whitespace-normal font-medium text-white">
                    {post.post_name}
                  </DataTableCell>
                  <DataTableCell align="center" width="10%" centerContent>
                    <code className="rounded-md bg-slate-800/80 px-2 py-0.5 text-xs text-orange-300">
                      {post.post_code}
                    </code>
                  </DataTableCell>
                  <DataTableCell align="center" width="15%" centerContent>
                    <Badge variant={categoryBadgeVariant(post.staff_category)}>
                      {post.staff_category}
                    </Badge>
                  </DataTableCell>
                  <DataTableCell align="center" width="15%" muted centerContent>
                    {post.appointment_nature}
                  </DataTableCell>
                  <DataTableCell
                    align="center"
                    width="10%"
                    centerContent
                    className="font-semibold tabular-nums"
                  >
                    {post.sanctioned_count}
                  </DataTableCell>
                  <DataTableCell align="center" width="10%" centerContent className="tabular-nums">
                    {assignmentsWarning ? "—" : post.filled}
                  </DataTableCell>
                  <DataTableCell align="center" width="10%" centerContent>
                    <VacancyCell
                      vacant={post.vacant}
                      filled={post.filled}
                      sanctioned={post.sanctioned_count}
                      unavailable={Boolean(assignmentsWarning)}
                    />
                  </DataTableCell>
                  {showActionsColumn ? (
                    <DataTableCell align="center" width="5%" centerContent>
                      {canUpdatePost ? (
                        <Button
                          variant="ghost"
                          onClick={() => openEditModal(post)}
                          aria-label={`Edit ${post.post_name}`}
                          className="!p-2"
                        >
                          <Icon icon="mdi:pencil-outline" className="h-4 w-4" />
                        </Button>
                      ) : null}
                      {canDeletePost ? (
                        <Button
                          variant="danger"
                          onClick={() => handleDelete(post.id)}
                          aria-label={`Delete ${post.post_name}`}
                          className="!p-2"
                        >
                          <Icon icon="mdi:delete-outline" className="h-4 w-4" />
                        </Button>
                      ) : null}
                    </DataTableCell>
                  ) : null}
                </DataTableRow>
              ))
            )}
          </DataTableBody>
        </DataTable>
      </div>

      <ErpModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        eyebrow={currentPost ? "Edit Post" : "New Post"}
        title={currentPost ? "Edit Staff Post" : "Add Staff Post"}
        size="md"
      >
        <form onSubmit={handleCreateEdit}>
          <FormGrid columns={1}>
            <FormField label="Post Name" htmlFor="post_name">
              <Input
                type="text"
                id="post_name"
                name="post_name"
                value={formData.post_name}
                onChange={handleInputChange}
                required
              />
            </FormField>

            <FormField label="Post Code" htmlFor="post_code">
              <Input
                type="text"
                id="post_code"
                name="post_code"
                value={formData.post_code}
                onChange={handleInputChange}
                required
              />
            </FormField>

            <FormField label="Staff Category" htmlFor="staff_category">
              <Select
                id="staff_category"
                name="staff_category"
                value={formData.staff_category}
                onChange={handleInputChange}
                required
              >
                <option value="Teaching">Teaching</option>
                <option value="Administrative">Administrative</option>
                <option value="Office">Office</option>
                <option value="Support">Support</option>
                <option value="Contractual">Contractual</option>
              </Select>
            </FormField>

            <FormField label="Appointment Nature" htmlFor="appointment_nature">
              <Select
                id="appointment_nature"
                name="appointment_nature"
                value={formData.appointment_nature}
                onChange={handleInputChange}
                required
              >
                <option value="Permanent">Permanent</option>
                <option value="Temporary">Temporary</option>
                <option value="Contractual">Contractual</option>
                <option value="Part-time">Part-time</option>
                <option value="Outsourced">Outsourced</option>
                <option value="Deputation">Deputation</option>
              </Select>
            </FormField>

            <FormField label="Sanctioned Count" htmlFor="sanctioned_count">
              <Input
                type="number"
                id="sanctioned_count"
                name="sanctioned_count"
                value={formData.sanctioned_count}
                onChange={handleInputChange}
                required
                min="0"
              />
            </FormField>
          </FormGrid>

          <FormActions>
            <Button type="button" variant="secondary" onClick={() => setIsModalOpen(false)}>
              Cancel
            </Button>
            <Button type="submit">{currentPost ? "Update" : "Create"}</Button>
          </FormActions>
        </form>
      </ErpModal>
    </DashboardLayout>
  );
};

export default StaffPosts;
