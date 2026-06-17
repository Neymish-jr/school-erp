import { useState } from "react";
import API from "../../../api/axios";
import {
  TEACHER_STATUS_OPTIONS,
  TeacherStatusSelect,
} from "./TeacherStatusBadge";

const STORAGE_KEY = "school-erp-teacher-meta";

const loadMeta = () => {
  try {
    const saved = localStorage.getItem(STORAGE_KEY);
    return saved ? JSON.parse(saved) : {};
  } catch {
    return {};
  }
};

const saveMeta = (meta) => {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(meta));
};

const buildFormFromTeacher = (teacher) => ({
  fullName: teacher.teacher_name || "",
  email: teacher.email || "",
  phone: teacher.phone || "",
  subject: teacher.subject || teacher.designation || "",
  qualification: teacher.qualification || "",
  gender: teacher.gender || "",
  age: teacher.age || 30,
});

function TeacherPersonalDetailsTab({ teacher, onTeacherUpdate }) {
  const [isEditing, setIsEditing] = useState(false);
  const [formData, setFormData] = useState(() => buildFormFromTeacher(teacher));
  const [isSaving, setIsSaving] = useState(false);
  const [isUpdatingStatus, setIsUpdatingStatus] = useState(false);
  const [error, setError] = useState("");
  const [successMessage, setSuccessMessage] = useState("");

  const getAuthHeaders = () => {
    const token = localStorage.getItem("token");
    return token ? { Authorization: `Bearer ${token}` } : {};
  };

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handlePhoneChange = (e) => {
    const value = e.target.value;
    if (/^\d{0,10}$/.test(value)) {
      setFormData((prev) => ({ ...prev, phone: value }));
    }
  };

  const handleEdit = () => {
    setFormData(buildFormFromTeacher(teacher));
    setError("");
    setSuccessMessage("");
    setIsEditing(true);
  };

  const handleCancel = () => {
    setFormData(buildFormFromTeacher(teacher));
    setError("");
    setSuccessMessage("");
    setIsEditing(false);
  };

  const handleStatusChange = async (event) => {
    const newStatus = event.target.value;
    const currentStatus = teacher.status || "active";

    if (newStatus === currentStatus) {
      return;
    }

    setIsUpdatingStatus(true);
    setError("");
    setSuccessMessage("");

    try {
      const response = await API.put(
        `/api/teachers/${teacher.id}`,
        { status: newStatus },
        { headers: getAuthHeaders() }
      );

      const updatedTeacher = {
        ...teacher,
        status: response?.data?.data?.status || newStatus,
      };

      onTeacherUpdate(updatedTeacher);
      setSuccessMessage(
        `Employment status updated to ${
          TEACHER_STATUS_OPTIONS.find((option) => option.value === newStatus)?.label ||
          newStatus
        }.`
      );
    } catch (err) {
      setError(err?.response?.data?.message || "Unable to update employment status.");
    } finally {
      setIsUpdatingStatus(false);
    }
  };

  const handleSave = async (e) => {
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

      await API.put(`/api/teachers/${teacher.id}`, payload, {
        headers: getAuthHeaders(),
      });

      const meta = loadMeta();
      const nextMeta = {
        ...meta,
        [teacher.id]: { email, subject, qualification },
      };
      saveMeta(nextMeta);

      onTeacherUpdate({
        ...teacher,
        teacher_name: fullName,
        email,
        phone,
        subject,
        designation: subject,
        qualification,
        gender: formData.gender,
        age,
      });

      setSuccessMessage("Teacher details updated successfully.");
      setIsEditing(false);
    } catch (err) {
      setError(err?.response?.data?.message || "Unable to save teacher details.");
    } finally {
      setIsSaving(false);
    }
  };

  const inputClass =
    "mt-2 w-full rounded-2xl border border-slate-700 bg-slate-950 px-4 py-3 text-white outline-none transition focus:border-orange-400";
  const labelClass = "text-xs font-semibold uppercase tracking-wider text-slate-500";

  const fields = [
    { key: "fullName", label: "Teacher Name", type: "text", placeholder: "Enter full name" },
    { key: "email", label: "Email", type: "email", placeholder: "teacher@example.com" },
    { key: "phone", label: "Phone", type: "phone", placeholder: "10-digit phone number" },
    { key: "gender", label: "Gender", type: "select" },
    { key: "qualification", label: "Qualification", type: "text", placeholder: "e.g. M.Sc, B.Ed" },
    { key: "subject", label: "Teaching Subject", type: "text", placeholder: "e.g. Mathematics" },
  ];

  const displayValue = (key) => {
    switch (key) {
      case "fullName":
        return teacher.teacher_name || "—";
      case "email":
        return teacher.email || "—";
      case "phone":
        return teacher.phone || "—";
      case "gender":
        return teacher.gender || "—";
      case "qualification":
        return teacher.qualification || "—";
      case "subject":
        return teacher.subject || teacher.designation || "—";
      default:
        return "—";
    }
  };

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-bold text-white">Personal Details</h3>
        {!isEditing && (
          <button
            type="button"
            onClick={handleEdit}
            className="rounded-xl bg-amber-400 px-4 py-2 text-sm font-semibold text-slate-950 transition hover:bg-amber-300"
          >
            Edit Details
          </button>
        )}
      </div>

      {error ? (
        <div className="rounded-2xl border border-rose-500/40 bg-rose-500/10 px-4 py-3 text-sm text-rose-100">
          {error}
        </div>
      ) : null}

      {successMessage ? (
        <div className="rounded-2xl border border-emerald-500/40 bg-emerald-500/10 px-4 py-3 text-sm text-emerald-100">
          {successMessage}
        </div>
      ) : null}

      <form onSubmit={handleSave}>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 rounded-2xl border border-slate-800 bg-slate-900 p-5">
          <div>
            <p className={labelClass}>Employment Status</p>
            <div className="mt-1">
              <TeacherStatusSelect
                compact
                status={teacher.status || "active"}
                onChange={handleStatusChange}
                disabled={isUpdatingStatus}
                ariaLabel={`Change employment status for ${teacher.teacher_name || "staff member"}`}
              />
            </div>
          </div>

          {fields.map(({ key, label, type, placeholder }) => (
            <div key={key}>
              <p className={labelClass}>{label}</p>
              {isEditing ? (
                type === "select" ? (
                  <select
                    name="gender"
                    required
                    value={formData.gender}
                    onChange={handleInputChange}
                    className={inputClass}
                  >
                    <option value="">Select gender</option>
                    <option value="Male">Male</option>
                    <option value="Female">Female</option>
                    <option value="Other">Other</option>
                  </select>
                ) : type === "phone" ? (
                  <input
                    type="text"
                    name="phone"
                    required
                    value={formData.phone}
                    onChange={handlePhoneChange}
                    className={inputClass}
                    placeholder={placeholder}
                  />
                ) : (
                  <input
                    type={type}
                    name={key}
                    required
                    value={formData[key]}
                    onChange={handleInputChange}
                    className={inputClass}
                    placeholder={placeholder}
                  />
                )
              ) : (
                <p
                  className={`mt-1 text-sm font-medium text-slate-200 ${
                    key === "fullName" ? "capitalize" : ""
                  }`}
                >
                  {displayValue(key)}
                </p>
              )}
            </div>
          ))}
        </div>

        {isEditing && (
          <div className="mt-6 flex justify-end gap-3">
            <button
              type="button"
              onClick={handleCancel}
              disabled={isSaving}
              className="rounded-2xl border border-slate-700 px-4 py-3 text-sm font-semibold text-white transition hover:border-slate-500 disabled:cursor-not-allowed disabled:opacity-60"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSaving}
              className="rounded-2xl bg-orange-500 px-4 py-3 text-sm font-semibold text-white transition hover:bg-orange-400 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {isSaving ? "Saving..." : "Save Changes"}
            </button>
          </div>
        )}
      </form>
    </div>
  );
}

export default TeacherPersonalDetailsTab;
