import { Icon } from "@iconify/react";
import { useLocation } from "react-router-dom";
import { useSidebar } from "../context/SidebarContext";
import { getPageTitle } from "../config/pageTitles";
import { usePermissions } from "../hooks/usePermissions";

function Navbar() {
  const { isCollapsed, toggleCollapsed, toggleMobile } = useSidebar();
  const { pathname } = useLocation();
  const { role } = usePermissions();
  const pageTitle = getPageTitle(pathname, role);

  return (
    <div className="flex h-16 items-center justify-between gap-4 border-b border-slate-800 bg-slate-900 px-4 text-white sm:px-6">
      <div className="flex items-center gap-3">
        <button
          type="button"
          aria-label="Open navigation menu"
          className="inline-flex items-center justify-center rounded-xl border border-slate-700 bg-slate-950 p-2.5 text-slate-200 transition hover:border-orange-500/40 hover:text-orange-300 lg:hidden"
          onClick={toggleMobile}
        >
          <Icon icon="mdi:menu" className="h-5 w-5" />
        </button>

        <button
          type="button"
          aria-label={isCollapsed ? "Expand sidebar" : "Collapse sidebar"}
          className="hidden items-center justify-center rounded-xl border border-slate-700 bg-slate-950 p-2.5 text-slate-200 transition hover:border-orange-500/40 hover:text-orange-300 lg:inline-flex"
          onClick={toggleCollapsed}
        >
          <Icon
            icon={isCollapsed ? "mdi:chevron-double-right" : "mdi:chevron-double-left"}
            className="h-5 w-5"
          />
        </button>

        <h1 className="truncate text-lg font-semibold sm:text-xl">{pageTitle}</h1>
      </div>

      <button
        type="button"
        className="rounded-xl bg-rose-600 px-4 py-2 text-sm font-semibold transition hover:bg-rose-500"
        onClick={() => {
          const confirmLogout = window.confirm("Are you sure you want to logout?");

          if (!confirmLogout) return;

          localStorage.removeItem("token");
          window.location.href = "/";
        }}
      >
        Logout
      </button>
    </div>
  );
}

export default Navbar;
