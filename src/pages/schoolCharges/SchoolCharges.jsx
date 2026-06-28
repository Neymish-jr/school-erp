import { useMemo } from "react";
import { useSearchParams } from "react-router-dom";
import DashboardLayout from "../../layouts/DashboardLayout";
import ChargeCatalogPanel from "./components/ChargeCatalogPanel";
import TeacherAdministrativeChargesManager from "../teacherAdministrativeCharges/components/TeacherAdministrativeChargesManager";

const TAB_CATALOG = "catalog";
const TAB_ASSIGNMENTS = "assignments";

const TABS = [
  { id: TAB_CATALOG, label: "Charge Catalog" },
  { id: TAB_ASSIGNMENTS, label: "Assignments" },
];

function SchoolCharges() {
  const [searchParams, setSearchParams] = useSearchParams();

  const activeTab = useMemo(() => {
    const tab = searchParams.get("tab");
    return tab === TAB_ASSIGNMENTS ? TAB_ASSIGNMENTS : TAB_CATALOG;
  }, [searchParams]);

  const setActiveTab = (tabId) => {
    setSearchParams({ tab: tabId }, { replace: true });
  };

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div>
          <p className="text-sm uppercase tracking-[0.3em] text-orange-300">
            Staff Management
          </p>
          <h1 className="mt-3 text-4xl font-bold text-white">School Charges</h1>
          <p className="mt-2 max-w-2xl text-slate-300">
            Manage the charge catalog and assign administrative responsibilities to teachers.
          </p>
        </div>

        <div className="flex gap-2 p-1 bg-slate-950 rounded-2xl w-max border border-slate-800">
          {TABS.map((tab) => (
            <button
              key={tab.id}
              type="button"
              onClick={() => setActiveTab(tab.id)}
              className={`px-4 py-2 rounded-xl text-sm font-semibold transition ${
                activeTab === tab.id
                  ? "bg-slate-800 text-white"
                  : "text-slate-400 hover:text-slate-200"
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {activeTab === TAB_CATALOG ? (
          <ChargeCatalogPanel embedded />
        ) : (
          <TeacherAdministrativeChargesManager hideHeader embedded />
        )}
      </div>
    </DashboardLayout>
  );
}

export default SchoolCharges;
