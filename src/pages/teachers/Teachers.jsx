import { useEffect, useMemo, useState } from "react";
import { Icon } from "@iconify/react";
import DashboardLayout from "../../layouts/DashboardLayout";
import API from "../../api/axios";
import TeacherStatusBadge from "./components/TeacherStatusBadge";
import {
  ACTIVE_STAFF_STATUS,
  STATUS_FILTER_ALL,
  TEACHER_STATUS_FILTER_OPTIONS,
  isActiveStaffTeacher,
  isFormerStaffTeacher,
} from "./constants/teacherStatus";
import {
  PageHeader,
  FilterToolbar,
  FilterSearch,
  FilterSelect,
  FilterCheckbox,
  Button,
  Alert,
  TablePagination,
  ErpModal,
  FormField,
  Input,
  Select,
  FormGrid,
  FormActions,
  StaffSummary,
  StaffDirectoryList,
  StaffDirectoryRow,
  StaffDirectoryEmpty,
  StaffDirectorySkeleton,
  StaffDirectoryFooter,
  erp,
} from "../../design-system";

const PAGE_SIZE = 10;
const STORAGE_KEY = "school-erp-teacher-meta";
const NOT_ASSIGNED_STAFF_POST = "Not Assigned";
const EM_DASH = "\u2014";

const emptyForm = {
  fullName: "",
  email: "",
  phone: "",
  subject: "",
  qualification: "",
  gender: "",
  age: 30,
};

const loadMeta = () => {
  try {
    const saved = localStorage.getItem(STORAGE_KEY);

    return saved ? JSON.parse(saved) : {};
  } catch (error) {
    return {};
  }
};

const saveMeta = (meta) => {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(meta));
};

function Teachers() {
  const [teachers, setTeachers] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState("");
  const [successMessage, setSuccessMessage] = useState("");
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState(ACTIVE_STAFF_STATUS);
  const [showFormerStaff, setShowFormerStaff] = useState(false);
  const [page, setPage] = useState(1);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [formData, setFormData] = useState(emptyForm);
  const [teacherMeta, setTeacherMeta] = useState(loadMeta);

  const getAuthHeaders = () => {
    const token = localStorage.getItem("token");

    return token
      ? {
          Authorization: `Bearer ${token}`,
        }
      : {};
  };

  const normalizeTeacher = (teacher, meta = {}, staffPostMap = {}) => ({
    ...teacher,
    email: meta.email || "",
    subject: meta.subject || teacher.designation || "",
    qualification: meta.qualification || "",
    staffPost: staffPostMap[teacher.id] || NOT_ASSIGNED_STAFF_POST,
  });

  const fetchTeachers = async () => {
    setIsLoading(true);
    setError("");

    try {
      const currentMeta = loadMeta();
      const firstPage = await API.get("/api/teachers", {
        headers: getAuthHeaders(),
        params: {
          page: 1,
          limit: 1000,
          search: "",
        },
      });

      const payload = firstPage?.data?.data || {};
      const totalPages = payload.totalPages || 1;
      const pagesToFetch = Array.from({ length: totalPages }, (_, index) => index + 1)
        .filter((currentPage) => currentPage !== 1);

      const allResponses = await Promise.all(
        pagesToFetch.map((currentPage) =>
          API.get("/api/teachers", {
            headers: getAuthHeaders(),
            params: {
              page: currentPage,
              limit: 1000,
              search: "",
            },
          })
        )
      );

      const allTeachers = [payload.teachers || [], ...allResponses.map((response) => response?.data?.data?.teachers || [])]
        .flat();

      let staffPostMap = {};
      try {
        const assignmentsResponse = await API.get("/api/teacher-staff-post-assignments", {
          headers: getAuthHeaders(),
          params: { is_active: "true" },
        });
        const activeAssignments = assignmentsResponse?.data?.data || [];
        staffPostMap = activeAssignments.reduce((map, assignment) => {
          if (assignment.teacher_id && assignment.post_name) {
            map[assignment.teacher_id] = assignment.post_name;
          }
          return map;
        }, {});
      } catch (assignmentsErr) {
        console.error("Failed to fetch staff post assignments", assignmentsErr);
      }

      const enrichedTeachers = allTeachers.map((teacher) =>
        normalizeTeacher(teacher, currentMeta[teacher.id] || {}, staffPostMap)
      );

      setTeachers(enrichedTeachers);
    } catch (err) {
      setTeachers([]);
      setError(
        err?.response?.data?.message ||
          "Unable to load teachers right now. Please try again."
      );
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchTeachers();
  }, []);

  const activeStaffCount = useMemo(
    () => teachers.filter(isActiveStaffTeacher).length,
    [teachers]
  );

  const formerStaffCount = useMemo(
    () => teachers.filter(isFormerStaffTeacher).length,
    [teachers]
  );

  const totalStaffCount = teachers.length;

  const filteredTeachers = useMemo(() => {
    const query = search.trim().toLowerCase();

    return teachers.filter((teacher) => {
      const currentStatus = teacher.status || ACTIVE_STAFF_STATUS;

      if (!showFormerStaff && currentStatus !== ACTIVE_STAFF_STATUS) {
        return false;
      }

      const matchesStatus =
        statusFilter === STATUS_FILTER_ALL || currentStatus === statusFilter;

      if (!matchesStatus) {
        return false;
      }

      if (!query) {
        return true;
      }

      const fullName = (teacher.teacher_name || "").toLowerCase();
      const email = (teacher.email || "").toLowerCase();
      const phone = (teacher.phone || "").toLowerCase();
      const designation = (teacher.staffPost || "").toLowerCase();

      return (
        fullName.includes(query) ||
        email.includes(query) ||
        phone.includes(query) ||
        designation.includes(query)
      );
    });
  }, [teachers, search, statusFilter, showFormerStaff]);

  const totalPages = Math.max(1, Math.ceil(filteredTeachers.length / PAGE_SIZE));

  useEffect(() => {
    if (page > totalPages) {
      setPage(totalPages);
    }
  }, [page, totalPages]);

  const visibleTeachers = filteredTeachers.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  const openAddModal = () => {
    setFormData(emptyForm);
    setError("");
    setSuccessMessage("");
    setIsModalOpen(true);
  };

  const closeModal = () => {
    setIsModalOpen(false);
    setFormData(emptyForm);
  };

  const handleInputChange = (e) => {
    const { name, value } = e.target;

    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }));
  };

  const handlePhoneChange = (e) => {
    const value = e.target.value;

    if (/^\d{0,10}$/.test(value)) {
      setFormData((prev) => ({
        ...prev,
        phone: value,
      }));
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    const phone = formData.phone.trim();
    const fullName = formData.fullName.trim();
    const email = formData.email.trim();
    const subject = formData.subject.trim();
    const qualification = formData.qualification.trim();
    const age = Number(formData.age);

    if (!fullName) {
      setError("Full name is required.");
      return;
    }

    if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      setError("Please provide a valid email address.");
      return;
    }

    if (!phone || phone.length !== 10) {
      setError("Phone number must be exactly 10 digits.");
      return;
    }

    if (!subject) {
      setError("Subject is required.");
      return;
    }

    if (!qualification) {
      setError("Qualification is required.");
      return;
    }

    if (!formData.gender) {
      setError("Please select a gender.");
      return;
    }

    if (!Number.isFinite(age) || age < 18 || age > 65) {
      setError("Age must be between 18 and 65.");
      return;
    }

    setIsSaving(true);
    setError("");
    setSuccessMessage("");

    try {
      const payload = {
        teacher_name: fullName,
        designation: subject,
        phone,
        age,
        gender: formData.gender,
      };

      const response = await API.post("/api/teachers", payload, {
        headers: getAuthHeaders(),
      });

      const createdTeacher = response?.data?.data;

      if (createdTeacher?.id) {
        setTeacherMeta((prev) => {
          const next = {
            ...prev,
            [createdTeacher.id]: {
              email,
              subject,
              qualification,
            },
          };

          saveMeta(next);

          return next;
        });
      }

      setSuccessMessage("Teacher added successfully.");

      closeModal();
      await fetchTeachers();
      setPage(1);
    } catch (err) {
      setError(err?.response?.data?.message || "Unable to save teacher details.");
    } finally {
      setIsSaving(false);
    }
  };

  const resetFilters = () => {
    setSearch("");
    setStatusFilter(ACTIVE_STAFF_STATUS);
    setShowFormerStaff(false);
    setPage(1);
  };

  const handleShowFormerStaffChange = (enabled) => {
    setShowFormerStaff(enabled);
    if (!enabled) {
      setStatusFilter(ACTIVE_STAFF_STATUS);
    }
    setPage(1);
  };

  const statusFilterOptions = TEACHER_STATUS_FILTER_OPTIONS.map((option) => ({
    value: option.value,
    label: option.label,
  }));

  return (
    <DashboardLayout>
      <div className={erp.page}>
        <PageHeader
          eyebrow="Staff Management"
          title="Staff Directory"
          description="Browse school employees and designations. Update employment status from each staff profile."
          actions={
            <Button onClick={openAddModal}>
              <Icon icon="mdi:account-plus-outline" className="h-4 w-4" />
              Add Teacher
            </Button>
          }
        />

        <StaffSummary
          total={totalStaffCount}
          active={activeStaffCount}
          former={formerStaffCount}
          isLoading={isLoading}
          filteredCount={filteredTeachers.length}
        />

        <FilterToolbar
          title="Search & filter"
          onReset={resetFilters}
          showReset
        >
          <FilterSearch
            value={search}
            onChange={(e) => {
              setSearch(e.target.value);
              setPage(1);
            }}
            placeholder="Search by name, phone, or designation"
          />
          <FilterSelect
            value={statusFilter}
            onChange={(e) => {
              setStatusFilter(e.target.value);
              setPage(1);
            }}
            disabled={!showFormerStaff}
            aria-label="Filter by employment status"
            options={statusFilterOptions}
          />
          <FilterCheckbox
            checked={showFormerStaff}
            onChange={(e) => handleShowFormerStaffChange(e.target.checked)}
            label="Show former staff"
          />
        </FilterToolbar>

        {error ? <Alert variant="error">{error}</Alert> : null}
        {successMessage ? <Alert variant="success">{successMessage}</Alert> : null}

        <StaffDirectoryList>
          {isLoading ? (
            <StaffDirectorySkeleton rows={5} />
          ) : visibleTeachers.length === 0 ? (
            <StaffDirectoryEmpty message="No staff found for the current search or filters." />
          ) : (
            visibleTeachers.map((teacher) => (
              <StaffDirectoryRow
                key={teacher.id}
                name={teacher.teacher_name || EM_DASH}
                designation={teacher.staffPost}
                phone={teacher.phone}
                profileTo={`/teachers/${teacher.id}`}
                unassignedLabel={NOT_ASSIGNED_STAFF_POST}
                phoneFallback={EM_DASH}
                statusBadge={
                  <TeacherStatusBadge compact status={teacher.status || "active"} />
                }
              />
            ))
          )}

          {!isLoading && filteredTeachers.length > 0 ? (
            <StaffDirectoryFooter>
              <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <TablePagination
                  page={page}
                  totalPages={totalPages}
                  totalItems={filteredTeachers.length}
                  pageSize={PAGE_SIZE}
                  onPageChange={setPage}
                  isLoading={isLoading}
                />
              </div>
            </StaffDirectoryFooter>
          ) : null}
        </StaffDirectoryList>
      </div>

      <ErpModal
        isOpen={isModalOpen}
        onClose={closeModal}
        eyebrow="Add Teacher"
        title="Create a new teacher record"
        size="lg"
      >
        <form onSubmit={handleSubmit}>
          <FormGrid>
            <FormField label="Full Name" htmlFor="fullName">
              <Input
                id="fullName"
                type="text"
                name="fullName"
                required
                value={formData.fullName}
                onChange={handleInputChange}
                placeholder="Enter full name"
              />
            </FormField>

            <FormField label="Email" htmlFor="email">
              <Input
                id="email"
                type="email"
                name="email"
                required
                value={formData.email}
                onChange={handleInputChange}
                placeholder="teacher@example.com"
              />
            </FormField>

            <FormField label="Phone Number" htmlFor="phone">
              <Input
                id="phone"
                type="text"
                name="phone"
                required
                value={formData.phone}
                onChange={handlePhoneChange}
                placeholder="10-digit phone number"
              />
            </FormField>

            <FormField label="Subject" htmlFor="subject">
              <Input
                id="subject"
                type="text"
                name="subject"
                required
                value={formData.subject}
                onChange={handleInputChange}
                placeholder="e.g. Mathematics"
              />
            </FormField>

            <FormField label="Qualification" htmlFor="qualification">
              <Input
                id="qualification"
                type="text"
                name="qualification"
                required
                value={formData.qualification}
                onChange={handleInputChange}
                placeholder="e.g. M.Sc, B.Ed"
              />
            </FormField>

            <FormField label="Gender" htmlFor="gender">
              <Select
                id="gender"
                name="gender"
                required
                value={formData.gender}
                onChange={handleInputChange}
              >
                <option value="">Select gender</option>
                <option value="Male">Male</option>
                <option value="Female">Female</option>
                <option value="Other">Other</option>
              </Select>
            </FormField>
          </FormGrid>

          <FormActions>
            <Button type="button" variant="secondary" onClick={closeModal}>
              Cancel
            </Button>
            <Button type="submit" disabled={isSaving}>
              {isSaving ? "Saving…" : "Add Teacher"}
            </Button>
          </FormActions>
        </form>
      </ErpModal>
    </DashboardLayout>
  );
}

export default Teachers;
