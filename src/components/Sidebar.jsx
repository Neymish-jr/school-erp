import { NavLink } from "react-router-dom";

const navSections = [
  {
    title: "Governance",
    items: [{ label: "Dashboard", path: "/dashboard" }],
  },
  {
    title: "Academic",
    items: [
      { label: "Students", path: "/students" },
      { label: "Classes", path: "/classes" },
      { label: "Teachers", path: "/teachers" },
      { label: "Subjects", path: "/subjects" },
      { label: "Teacher Subjects", path: "/teacher-subjects" },
      { label: "Attendance", path: "/attendance" },
      { label: "Results", path: "/results" },
      { label: "Report Card", path: "/report-card" },
      { label: "Timetable", path: "/timetable" },
    ],
  },
  {
    title: "Administration",
    items: [
      { label: "Staff Posts", path: "/staff-posts" },
      {
        label: "Administrative Charges",
        path: "/administrative-charges",
      },
    ],
  },
  {
    title: "Finance",
    items: [],
  },
];

function Sidebar() {
  return (
    <div className="w-72 min-h-screen bg-slate-950 text-white p-5 border-r border-white/10">
      <h1 className="text-2xl font-bold mb-8 text-cyan-200">
        School ERP
      </h1>

      <div className="flex flex-col gap-6">
        {navSections.map((section) => (
          <div key={section.title}>
            <p className="mb-2 px-3 text-xs font-semibold uppercase tracking-[0.22em] text-slate-500">
              {section.title}
            </p>

            {section.items.length > 0 ? (
              <div className="flex flex-col gap-2">
                {section.items.map((item) => (
                  <NavLink
                    key={item.path}
                    to={item.path}
                    className={({ isActive }) =>
                      `rounded-xl px-4 py-3 text-sm font-medium transition ${
                        isActive
                          ? "bg-cyan-400 text-slate-950"
                          : "text-slate-200 hover:bg-slate-800 hover:text-white"
                      }`
                    }
                  >
                    {item.label}
                  </NavLink>
                ))}
              </div>
            ) : (
              <div className="rounded-xl border border-slate-800 px-4 py-3 text-sm text-slate-500">
                Coming soon
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}

export default Sidebar;
