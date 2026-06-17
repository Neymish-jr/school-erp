import { useState, useEffect } from "react";
import { Link, useParams, useNavigate } from "react-router-dom";
import DashboardLayout from "../../layouts/DashboardLayout";
import API from "../../api/axios";
import TeacherSubjectAssignmentsTab from "./components/TeacherSubjectAssignmentsTab";
import TeacherResponsibilitiesTab from "./components/TeacherResponsibilitiesTab";
import TeacherPersonalDetailsTab from "./components/TeacherPersonalDetailsTab";
import TeacherServiceHistoryTab from "./components/TeacherServiceHistoryTab";
import TeacherStatusBadge from "./components/TeacherStatusBadge";

const NOT_ASSIGNED_STAFF_POST = "Not Assigned";

function TeacherProfile() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState("overview");
  const [teacher, setTeacher] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState("");
  const [subjectCount, setSubjectCount] = useState(0);
  const [adminChargeCount, setAdminChargeCount] = useState(0);
  const [staffPostName, setStaffPostName] = useState(NOT_ASSIGNED_STAFF_POST);

  const getAuthHeaders = () => {
    const token = localStorage.getItem("token");
    return token ? { Authorization: `Bearer ${token}` } : {};
  };

  useEffect(() => {
    const fetchTeacherData = async () => {
      setIsLoading(true);
      setError("");

      try {
        const response = await API.get(`/api/teachers/${id}`, {
          headers: getAuthHeaders(),
        });
        
        // Also load meta data for email/subject fallback if needed, similar to Teachers.jsx
        const STORAGE_KEY = "school-erp-teacher-meta";
        let meta = {};
        try {
          const saved = localStorage.getItem(STORAGE_KEY);
          meta = saved ? JSON.parse(saved) : {};
        } catch (e) {}
        
        const rawTeacher = response.data.data;
        const teacherMeta = meta[rawTeacher.id] || {};
        
        setTeacher({
          ...rawTeacher,
          email: teacherMeta.email || rawTeacher.email || "",
          subject: teacherMeta.subject || rawTeacher.subject || rawTeacher.designation || "",
          qualification: teacherMeta.qualification || rawTeacher.qualification || "",
        });

        try {
          const subjectsResponse = await API.get(`/api/teacher-subject-assignments/teacher/${id}`, {
            headers: getAuthHeaders(),
          });
          const subjectAssignments = subjectsResponse.data?.data || [];
          setSubjectCount(subjectAssignments.filter((assignment) => assignment.is_active).length);
        } catch (subjectErr) {
          console.error("Failed to fetch subject count", subjectErr);
          setSubjectCount(0);
        }

        try {
          const adminResponse = await API.get(`/api/teacher-administrative-charge-assignments/teacher/${id}`, {
            headers: getAuthHeaders(),
          });
          const adminCharges = adminResponse.data?.data || [];
          setAdminChargeCount(adminCharges.filter(a => a.is_active).length);
        } catch (adminErr) {
          console.error("Failed to fetch admin charge count", adminErr);
          setAdminChargeCount(0);
        }

        try {
          const staffPostResponse = await API.get(
            `/api/teacher-staff-post-assignments/teacher/${id}/current`,
            { headers: getAuthHeaders() }
          );
          const currentAssignment = staffPostResponse.data?.data;
          setStaffPostName(currentAssignment?.post_name || NOT_ASSIGNED_STAFF_POST);
        } catch (staffPostErr) {
          console.error("Failed to fetch current staff post assignment", staffPostErr);
          setStaffPostName(NOT_ASSIGNED_STAFF_POST);
        }

      } catch (err) {
        setError(
          err?.response?.data?.message || "Failed to load teacher profile."
        );
      } finally {
        setIsLoading(false);
      }
    };

    fetchTeacherData();
  }, [id]);

  const tabs = [
    { id: "overview", label: "Overview" },
    { id: "personal", label: "Personal Details" },
    { id: "subjects", label: "Subjects" },
    { id: "responsibilities", label: "Responsibilities" },
    { id: "service-history", label: "Service History" },
    { id: "timetable", label: "Timetable" },
  ];

  const handleTeacherUpdate = (updatedTeacher) => {
    setTeacher(updatedTeacher);
  };

  if (isLoading) {
    return (
      <DashboardLayout>
        <div className="flex h-full w-full flex-col gap-6">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <div className="h-4 w-48 animate-pulse rounded bg-slate-800"></div>
              <div className="mt-2 h-8 w-64 animate-pulse rounded bg-slate-800"></div>
            </div>
          </div>
          <div className="grid grid-cols-1 gap-6 lg:grid-cols-4">
            <div className="lg:col-span-1">
              <div className="rounded-3xl border border-slate-800 bg-slate-900/50 p-6">
                <div className="mb-6 flex justify-center">
                  <div className="h-24 w-24 animate-pulse rounded-full bg-slate-800"></div>
                </div>
                <div className="mx-auto mb-2 h-6 w-32 animate-pulse rounded bg-slate-800"></div>
                <div className="mx-auto mb-6 h-4 w-24 animate-pulse rounded bg-slate-800"></div>
                <div className="flex flex-col gap-4 border-t border-slate-800 pt-6">
                  <div className="h-10 w-full animate-pulse rounded bg-slate-800"></div>
                  <div className="h-10 w-full animate-pulse rounded bg-slate-800"></div>
                  <div className="h-10 w-full animate-pulse rounded bg-slate-800"></div>
                </div>
              </div>
            </div>
            <div className="lg:col-span-3 flex flex-col gap-6">
              <div className="h-14 w-full animate-pulse rounded-2xl bg-slate-800"></div>
              <div className="h-[400px] w-full animate-pulse rounded-3xl bg-slate-800"></div>
            </div>
          </div>
        </div>
      </DashboardLayout>
    );
  }

  if (error) {
    return (
      <DashboardLayout>
        <div className="flex h-full w-full flex-col items-center justify-center gap-4">
          <p className="text-xl font-bold text-rose-500">{error}</p>
          <button
            onClick={() => navigate("/teachers")}
            className="rounded-xl border border-slate-700 bg-slate-800 px-6 py-2 font-semibold text-white transition hover:bg-slate-700"
          >
            Back to Teachers
          </button>
        </div>
      </DashboardLayout>
    );
  }

  if (!teacher) return null;

  return (
    <DashboardLayout>
      <div className="flex h-full w-full flex-col gap-6">
        
        {/* Header & Breadcrumbs */}
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <div className="flex items-center gap-2 text-sm text-slate-400">
              <Link to="/teachers" className="hover:text-orange-400 transition-colors">
                Teachers
              </Link>
              <span>/</span>
              <span className="text-slate-200">Teacher Profile</span>
            </div>
            <h1 className="mt-1 text-2xl font-bold text-white sm:text-3xl">
              Teacher Command Center
            </h1>
            <p className="mt-2 text-sm text-slate-400">
              Designation:{" "}
              <span
                className={
                  staffPostName === NOT_ASSIGNED_STAFF_POST
                    ? "text-slate-400"
                    : "font-semibold text-orange-400"
                }
              >
                {staffPostName}
              </span>
            </p>
          </div>
          <Link
            to="/teachers"
            className="inline-flex items-center justify-center rounded-xl border border-slate-700 bg-slate-800/50 px-4 py-2 text-sm font-semibold text-white transition hover:bg-slate-700"
          >
            Back to Teachers
          </Link>
        </div>

        {/* Main Grid Layout */}
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-4">
          
          {/* Left Sidebar */}
          <div className="lg:col-span-1">
            <div className="rounded-3xl border border-slate-800 bg-slate-900/50 p-6 sticky top-6">
              
              {/* Avatar Placeholder */}
              <div className="mb-6 flex justify-center">
                <div className="flex h-24 w-24 items-center justify-center rounded-full bg-slate-800 text-3xl font-bold text-slate-400 uppercase">
                  {teacher.teacher_name ? teacher.teacher_name.charAt(0) : "T"}
                </div>
              </div>

              <h2 className="text-center text-xl font-bold text-white capitalize">
                {teacher.teacher_name}
              </h2>
              <p className="mb-2 text-center text-sm text-slate-400">
                {teacher.subject || teacher.designation || "No designation"}
              </p>
              <p
                className={`mb-2 text-center text-sm font-semibold ${
                  staffPostName === NOT_ASSIGNED_STAFF_POST
                    ? "text-slate-400"
                    : "text-orange-400"
                }`}
              >
                {staffPostName}
              </p>
              <div className="mb-6 flex justify-center">
                <TeacherStatusBadge compact status={teacher.status || "active"} />
              </div>

              <div className="flex flex-col gap-4 border-t border-slate-800 pt-6">
                
                <div>
                  <p className="text-xs font-semibold uppercase tracking-wider text-slate-500">
                    Staff ID
                  </p>
                  <p className="mt-1 text-sm font-medium text-slate-200">
                    {`TCH-${teacher.id.toString().padStart(3, '0')}`}
                  </p>
                </div>

                <div>
                  <p className="text-xs font-semibold uppercase tracking-wider text-slate-500">
                    Phone
                  </p>
                  <p className="mt-1 text-sm font-medium text-slate-200">
                    {teacher.phone || "—"}
                  </p>
                </div>

                <div>
                  <p className="text-xs font-semibold uppercase tracking-wider text-slate-500">
                    Email
                  </p>
                  <p className="mt-1 text-sm font-medium text-slate-200 break-all">
                    {teacher.email || "—"}
                  </p>
                </div>

                <div>
                  <p className="text-xs font-semibold uppercase tracking-wider text-slate-500">
                    Qualification
                  </p>
                  <p className="mt-1 text-sm font-medium text-slate-200">
                    {teacher.qualification || "—"}
                  </p>
                </div>

              </div>
            </div>
          </div>

          {/* Right Content Area */}
          <div className="lg:col-span-3 flex flex-col gap-6">
            
            {/* Tabs Navigation */}
            <div className="flex flex-wrap gap-2 rounded-2xl border border-slate-800 bg-slate-900/50 p-2">
              {tabs.map((tab) => (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`rounded-xl px-4 py-2 text-sm font-medium transition-colors ${
                    activeTab === tab.id
                      ? "bg-orange-500/10 text-orange-400"
                      : "text-slate-400 hover:bg-slate-800 hover:text-slate-200"
                  }`}
                >
                  {tab.label}
                </button>
              ))}
            </div>

            {/* Tab Content Area */}
            <div className="rounded-3xl border border-slate-800 bg-slate-900/50 p-6 min-h-[400px]">
              
              {activeTab === "overview" && (
                <div className="flex flex-col gap-6">
                  
                  {/* Summary Cards */}
                  <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                    <div className="flex flex-col rounded-2xl border border-slate-800 bg-slate-900 p-5">
                      <p className="text-sm font-medium text-slate-400">Subjects Assigned</p>
                      <p className="mt-2 text-3xl font-bold text-white">{subjectCount}</p>
                      <p className="mt-1 text-xs text-slate-500">Active subject allocations</p>
                    </div>
                    <div className="flex flex-col rounded-2xl border border-slate-800 bg-slate-900 p-5">
                      <p className="text-sm font-medium text-slate-400">Administrative Charges</p>
                      <p className="mt-2 text-3xl font-bold text-white">{adminChargeCount}</p>
                      <p className="mt-1 text-xs text-slate-500">Active responsibilities</p>
                    </div>
                  </div>

                  {/* Personal Information */}
                  <div>
                    <h3 className="mb-4 text-lg font-bold text-white">Personal Information</h3>
                    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 rounded-2xl border border-slate-800 bg-slate-900 p-5">
                      <div>
                        <p className="text-xs font-semibold uppercase tracking-wider text-slate-500">Full Name</p>
                        <p className="mt-1 text-sm font-medium text-slate-200 capitalize">{teacher.teacher_name}</p>
                      </div>
                      <div>
                        <p className="text-xs font-semibold uppercase tracking-wider text-slate-500">Gender</p>
                        <p className="mt-1 text-sm font-medium text-slate-200">{teacher.gender || "—"}</p>
                      </div>
                      <div>
                        <p className="text-xs font-semibold uppercase tracking-wider text-slate-500">Age</p>
                        <p className="mt-1 text-sm font-medium text-slate-200">{teacher.age ? `${teacher.age} years` : "—"}</p>
                      </div>
                      <div>
                        <p className="text-xs font-semibold uppercase tracking-wider text-slate-500">Designation / Subject</p>
                        <p className="mt-1 text-sm font-medium text-slate-200">{teacher.subject || teacher.designation || "—"}</p>
                      </div>
                      <div>
                        <p className="text-xs font-semibold uppercase tracking-wider text-slate-500">Phone Number</p>
                        <p className="mt-1 text-sm font-medium text-slate-200">{teacher.phone || "—"}</p>
                      </div>
                      <div>
                        <p className="text-xs font-semibold uppercase tracking-wider text-slate-500">Email Address</p>
                        <p className="mt-1 text-sm font-medium text-slate-200">{teacher.email || "—"}</p>
                      </div>
                      <div>
                        <p className="text-xs font-semibold uppercase tracking-wider text-slate-500">Qualification</p>
                        <p className="mt-1 text-sm font-medium text-slate-200">{teacher.qualification || "—"}</p>
                      </div>
                      <div>
                        <p className="text-xs font-semibold uppercase tracking-wider text-slate-500">Employment Status</p>
                        <div className="mt-1">
                          <TeacherStatusBadge compact status={teacher.status || "active"} />
                        </div>
                      </div>
                      <div>
                        <p className="text-xs font-semibold uppercase tracking-wider text-slate-500">Staff ID</p>
                        <p className="mt-1 text-sm font-medium text-slate-200">{`TCH-${teacher.id.toString().padStart(3, '0')}`}</p>
                      </div>
                    </div>
                  </div>

                </div>
              )}

              {activeTab === "personal" && (
                <TeacherPersonalDetailsTab
                  teacher={teacher}
                  onTeacherUpdate={handleTeacherUpdate}
                />
              )}

              {activeTab === "subjects" && (
                <TeacherSubjectAssignmentsTab teacherId={teacher.id} />
              )}

              {activeTab === "responsibilities" && (
                <TeacherResponsibilitiesTab
                  teacherId={teacher.id}
                  onDesignationChange={setStaffPostName}
                  onAdminChargeCountChange={setAdminChargeCount}
                />
              )}

              {activeTab === "service-history" && (
                <TeacherServiceHistoryTab teacherId={teacher.id} />
              )}

              {activeTab === "timetable" && (
                <div className="flex h-full flex-col items-center justify-center text-center text-slate-400">
                  <p>Weekly Timetable Grid (Placeholder)</p>
                </div>
              )}

            </div>
          </div>

        </div>
      </div>
    </DashboardLayout>
  );
}

export default TeacherProfile;
