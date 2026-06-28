import { useEffect, useState } from "react";
import API from "../../../api/axios";
import { assignCharge } from "../../../api/charges";
import { Button, ErpModal } from "../../../design-system";
import { isActiveStaffTeacher } from "../../teachers/constants/teacherStatus";
import { getCurrentAcademicYear } from "../utils/academicYear";

function ChargeAssignModal({ isOpen, onClose, charge, onSuccess }) {
  const [teachers, setTeachers] = useState([]);
  const [isLoadingTeachers, setIsLoadingTeachers] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState("");
  const [formData, setFormData] = useState({
    teacher_id: "",
    academic_year: getCurrentAcademicYear(),
    remarks: "",
    is_additional_charge: false,
  });

  useEffect(() => {
    if (!isOpen) {
      return undefined;
    }

    let isCancelled = false;

    const loadTeachers = async () => {
      setIsLoadingTeachers(true);
      setError("");

      try {
        const response = await API.get("/api/teachers", {
          params: { page: 1, limit: 1000, search: "" },
        });
        const rows = (response?.data?.data?.teachers || []).filter(isActiveStaffTeacher);

        if (!isCancelled) {
          setTeachers(rows);
        }
      } catch (loadError) {
        if (!isCancelled) {
          setTeachers([]);
          setError(
            loadError?.response?.data?.message || "Unable to load teachers right now."
          );
        }
      } finally {
        if (!isCancelled) {
          setIsLoadingTeachers(false);
        }
      }
    };

    setFormData({
      teacher_id: "",
      academic_year: getCurrentAcademicYear(),
      remarks: "",
      is_additional_charge: false,
    });
    setError("");
    loadTeachers();

    return () => {
      isCancelled = true;
    };
  }, [isOpen, charge?.id]);

  const handleChange = (event) => {
    const { name, value, type, checked } = event.target;

    setFormData((prev) => ({
      ...prev,
      [name]: type === "checkbox" ? checked : value,
    }));
  };

  const handleSubmit = async (event) => {
    event.preventDefault();

    if (!charge?.id || !formData.teacher_id || !formData.academic_year.trim()) {
      setError("Please select a teacher and academic year.");
      return;
    }

    setIsSaving(true);
    setError("");

    try {
      await assignCharge({
        teacher_id: Number(formData.teacher_id),
        administrative_charge_id: Number(charge.id),
        academic_year: formData.academic_year.trim(),
        remarks: formData.remarks.trim(),
        is_additional_charge: formData.is_additional_charge,
      });

      onSuccess?.();
      onClose();
    } catch (submitError) {
      setError(
        submitError?.response?.data?.message ||
          submitError?.response?.data?.error ||
          "Unable to assign charge."
      );
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <ErpModal
      isOpen={isOpen}
      onClose={onClose}
      eyebrow="Assign Charge"
      title="Assign Teacher"
      size="lg"
    >
      <p className="mb-4 text-sm text-slate-400">
        Assign a teacher to <span className="font-medium text-white">{charge?.charge_name}</span>.
      </p>

      {error ? (
        <div className="mb-4 rounded-xl border border-rose-500/30 bg-rose-500/10 px-4 py-3 text-sm text-rose-100">
          {error}
        </div>
      ) : null}

      <form onSubmit={handleSubmit} className="grid gap-4">
        <label className="text-sm text-slate-200">
          Teacher <span className="text-rose-400">*</span>
          <select
            name="teacher_id"
            value={formData.teacher_id}
            onChange={handleChange}
            required
            disabled={isLoadingTeachers || isSaving}
            className="mt-2 w-full rounded-xl border border-slate-700 bg-slate-950 px-3.5 py-2.5 text-sm text-white outline-none transition focus:border-orange-500/60 disabled:opacity-60"
          >
            <option value="">
              {isLoadingTeachers ? "Loading teachers..." : "Select teacher"}
            </option>
            {teachers.map((teacher) => (
              <option key={teacher.id} value={teacher.id}>
                {teacher.teacher_name}
              </option>
            ))}
          </select>
        </label>

        <label className="text-sm text-slate-200">
          Academic Year <span className="text-rose-400">*</span>
          <input
            type="text"
            name="academic_year"
            value={formData.academic_year}
            onChange={handleChange}
            required
            placeholder="e.g. 2025-26"
            className="mt-2 w-full rounded-xl border border-slate-700 bg-slate-950 px-3.5 py-2.5 text-sm text-white outline-none transition focus:border-orange-500/60"
          />
        </label>

        <label className="text-sm text-slate-200">
          Remarks (optional)
          <input
            type="text"
            name="remarks"
            value={formData.remarks}
            onChange={handleChange}
            placeholder="Additional details..."
            className="mt-2 w-full rounded-xl border border-slate-700 bg-slate-950 px-3.5 py-2.5 text-sm text-white outline-none transition focus:border-orange-500/60"
          />
        </label>

        <label className="flex w-max cursor-pointer items-center gap-3 text-sm text-slate-200">
          <input
            type="checkbox"
            name="is_additional_charge"
            checked={formData.is_additional_charge}
            onChange={handleChange}
            className="h-5 w-5 rounded border-slate-700 bg-slate-950 accent-orange-500"
          />
          This is an additional charge
        </label>

        <div className="flex justify-end gap-3 border-t border-slate-800 pt-4">
          <Button variant="secondary" type="button" onClick={onClose} disabled={isSaving}>
            Cancel
          </Button>
          <Button type="submit" disabled={isSaving || isLoadingTeachers || !formData.teacher_id}>
            {isSaving ? "Assigning..." : "Assign Teacher"}
          </Button>
        </div>
      </form>
    </ErpModal>
  );
}

export default ChargeAssignModal;
