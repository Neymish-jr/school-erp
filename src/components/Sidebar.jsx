import { NavLink, useLocation } from "react-router-dom";
import { useState, useEffect } from "react";
import { Icon } from "@iconify/react";
import navigation from "../config/navigation";

function Sidebar() {
  const { pathname } = useLocation();

  const [openGroups, setOpenGroups] = useState(() => {
    const storedOpenGroups = localStorage.getItem("openNavigationGroups");
    return storedOpenGroups ? JSON.parse(storedOpenGroups) : {};
  });

  useEffect(() => {
    localStorage.setItem("openNavigationGroups", JSON.stringify(openGroups));
  }, [openGroups]);

  const toggleGroup = (groupLabel) => {
    setOpenGroups((prev) => ({
      ...prev,
      [groupLabel]: !prev[groupLabel],
    }));
  };

  return (
    <div className="w-72 min-h-screen bg-slate-950 text-white p-5 border-r border-white/10">
      <h1 className="text-2xl font-bold mb-8 text-cyan-200">
        School ERP
      </h1>

      <div className="flex flex-col gap-6">
        {navigation.map((group) => (
          <div key={group.label}>
            {group.path ? (
              <NavLink
                to={group.path}
                className={`flex items-center gap-3 rounded-xl px-4 py-3 text-sm font-medium transition ${
                  pathname === group.path
                    ? "bg-cyan-400 text-slate-950"
                    : "text-slate-200 hover:bg-slate-800 hover:text-white"
                }`}
              >
                <Icon icon={group.icon} className="h-5 w-5" />
                {group.label}
              </NavLink>
            ) : (
              <div
                className="flex cursor-pointer items-center justify-between rounded-xl px-4 py-3 text-sm font-medium text-slate-200 transition hover:bg-slate-800 hover:text-white"
                onClick={() => toggleGroup(group.label)}
              >
                <div className="flex items-center gap-3">
                  <Icon icon={group.icon} className="h-5 w-5" />
                  {group.label}
                </div>
                <Icon
                  icon={openGroups[group.label] ? "mdi:chevron-up" : "mdi:chevron-down"}
                  className="h-5 w-5"
                />
              </div>
            )}

            {group.children && openGroups[group.label] && (
              <div className="mt-2 flex flex-col gap-2 pl-6">
                {group.children.map((item) => (
                  <NavLink
                    key={item.path}
                    to={item.path}
                    className={`flex items-center gap-3 rounded-xl px-4 py-3 text-sm font-medium transition ${
                      pathname === item.path
                        ? "bg-cyan-400 text-slate-950"
                        : "text-slate-200 hover:bg-slate-800 hover:text-white"
                    }`}
                  >
                    {item.label}
                  </NavLink>
                ))}
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}

export default Sidebar;
