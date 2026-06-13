import TeacherStaffPostAssignmentsTab from "./TeacherStaffPostAssignmentsTab";
import TeacherAdministrativeChargesManager from "../../teacherAdministrativeCharges/components/TeacherAdministrativeChargesManager";

function TeacherResponsibilitiesTab({
  teacherId,
  onDesignationChange,
  onAdminChargeCountChange,
}) {
  return (
    <div className="space-y-8">
      <section
        className="rounded-3xl border border-slate-800 bg-slate-900/50 p-6"
        aria-labelledby="responsibilities-designation-heading"
      >
        <h3
          id="responsibilities-designation-heading"
          className="text-lg font-bold text-white mb-4"
        >
          Designation
        </h3>
        <TeacherStaffPostAssignmentsTab
          teacherId={teacherId}
          embedded
          onAssignmentsChange={onDesignationChange}
        />
      </section>

      <section
        className="rounded-3xl border border-slate-800 bg-slate-900/50 p-6"
        aria-labelledby="responsibilities-admin-charges-heading"
      >
        <h3
          id="responsibilities-admin-charges-heading"
          className="text-lg font-bold text-white mb-4"
        >
          Administrative Charges
        </h3>
        <TeacherAdministrativeChargesManager
          teacherId={teacherId}
          hideHeader
          embedded
          onAssignmentsChange={onAdminChargeCountChange}
        />
      </section>

      <section
        className="rounded-3xl border border-slate-800 bg-slate-900/50 p-6"
        aria-labelledby="responsibilities-pm-shri-heading"
      >
        <h3
          id="responsibilities-pm-shri-heading"
          className="text-lg font-bold text-white"
        >
          PM SHRI Responsibilities
        </h3>
        <p className="mt-2 text-sm text-slate-400">
          PM SHRI program responsibilities will be managed here. Coming soon.
        </p>
      </section>
    </div>
  );
}

export default TeacherResponsibilitiesTab;
