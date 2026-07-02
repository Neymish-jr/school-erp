import { Link } from "react-router-dom";
import DashboardLayout from "../../layouts/DashboardLayout";
import { erp } from "../../design-system";

function Unauthorized() {
  return (
    <DashboardLayout>
      <div className={`${erp.page} flex min-h-[60vh] flex-col items-center justify-center text-center`}>
        <p className="text-sm font-semibold uppercase tracking-wider text-orange-400">
          Access denied
        </p>
        <h1 className="mt-2 text-3xl font-bold text-white">You are not authorized to view this page</h1>
        <p className="mt-3 max-w-lg text-slate-400">
          Your account does not have the required permission for this module. Contact your school
          administrator if you believe this is a mistake.
        </p>
        <Link
          to="/dashboard"
          className="mt-8 inline-flex rounded-xl bg-orange-500 px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-orange-400"
        >
          Back to Dashboard
        </Link>
      </div>
    </DashboardLayout>
  );
}

export default Unauthorized;
