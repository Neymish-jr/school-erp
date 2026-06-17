import { NavLink } from "react-router-dom";
import { Icon } from "@iconify/react";
import { useSidebar } from "../context/SidebarContext";

function Sidebar() {
  const {
    navigation,
    isCollapsed,
    isMobileOpen,
    expandedSection,
    flyoutSection,
    toggleSection,
    toggleFlyout,
    setFlyoutSection,
    groupHasActiveChild,
    closeMobile,
  } = useSidebar();

  const isCompact = isCollapsed && !isMobileOpen;

  const linkClass = ({ isActive }) =>
    `flex items-center rounded-xl text-sm font-medium transition ${
      isCompact ? "justify-center px-3 py-3" : "gap-3 px-4 py-3"
    } ${
      isActive
        ? "bg-orange-500 text-white shadow-sm shadow-orange-500/20"
        : "text-slate-300 hover:bg-slate-800/80 hover:text-white"
    }`;

  const childLinkClass = ({ isActive }) =>
    `flex items-center gap-3 rounded-xl px-4 py-2.5 text-sm font-medium transition ${
      isActive
        ? "bg-orange-500/15 text-orange-300 ring-1 ring-orange-500/40"
        : "text-slate-400 hover:bg-slate-800/80 hover:text-slate-200"
    }`;

  const sidebarWidth = isCompact ? "w-[4.5rem]" : "w-72";

  return (
    <>
      {isMobileOpen ? (
        <button
          type="button"
          aria-label="Close navigation menu"
          className="fixed inset-0 z-40 bg-slate-950/70 backdrop-blur-sm lg:hidden"
          onClick={closeMobile}
        />
      ) : null}

      <aside
        className={`fixed inset-y-0 left-0 z-50 flex min-h-screen shrink-0 flex-col border-r border-slate-800 bg-slate-950 text-white transition-all duration-300 ease-in-out lg:static lg:translate-x-0 ${
          isMobileOpen ? "translate-x-0" : "-translate-x-full"
        } ${sidebarWidth} ${isCompact ? "p-3" : "p-5"}`}
      >
        <div className={`mb-6 flex items-center ${isCompact ? "justify-center" : ""}`}>
          {isCompact ? (
            <span
              className="flex h-10 w-10 items-center justify-center rounded-xl bg-orange-500/15 text-lg font-bold text-orange-400"
              title="School ERP"
            >
              S
            </span>
          ) : (
            <h1 className="text-2xl font-bold tracking-tight text-orange-400">School ERP</h1>
          )}
        </div>

        <nav className="erp-scrollbar flex flex-1 flex-col gap-2 overflow-y-auto overflow-x-hidden pb-4">
          {navigation.map((group) => {
            const isGroupActive = groupHasActiveChild(group);
            const isGroupOpen = expandedSection === group.label;
            const isFlyoutOpen = flyoutSection === group.label;

            if (group.path) {
              return (
                <NavLink
                  key={group.label}
                  to={group.path}
                  className={linkClass}
                  title={isCompact ? group.label : undefined}
                  onClick={() => {
                    setFlyoutSection(null);
                    closeMobile();
                  }}
                >
                  {({ isActive }) => (
                    <>
                      <Icon
                        icon={group.icon}
                        className={`h-5 w-5 shrink-0 ${isActive ? "text-white" : "text-slate-400"}`}
                      />
                      {!isCompact ? <span>{group.label}</span> : null}
                    </>
                  )}
                </NavLink>
              );
            }

            return (
              <div key={group.label} className="relative">
                <button
                  type="button"
                  title={isCompact ? group.label : undefined}
                  aria-expanded={isCompact ? isFlyoutOpen : isGroupOpen}
                  className={`flex w-full items-center rounded-xl text-sm font-medium transition ${
                    isCompact ? "justify-center px-3 py-3" : "justify-between px-4 py-3"
                  } ${
                    isGroupActive
                      ? "border-l-2 border-orange-500 bg-orange-500/10 text-orange-300"
                      : isGroupOpen || isFlyoutOpen
                        ? "bg-slate-900/80 text-slate-200"
                        : "text-slate-300 hover:bg-slate-800/80 hover:text-white"
                  }`}
                  onClick={() => {
                    if (isCompact) {
                      toggleFlyout(group.label);
                    } else {
                      toggleSection(group.label);
                    }
                  }}
                >
                  <div className={`flex items-center ${isCompact ? "" : "gap-3"}`}>
                    <Icon
                      icon={group.icon}
                      className={`h-5 w-5 shrink-0 ${isGroupActive ? "text-orange-400" : "text-slate-400"}`}
                    />
                    {!isCompact ? <span>{group.label}</span> : null}
                  </div>
                  {!isCompact ? (
                    <Icon
                      icon={isGroupOpen ? "mdi:chevron-up" : "mdi:chevron-down"}
                      className={`h-5 w-5 shrink-0 ${isGroupActive ? "text-orange-400" : "text-slate-500"}`}
                    />
                  ) : null}
                </button>

                {!isCompact && isGroupOpen && group.children ? (
                  <div className="mt-1 flex flex-col gap-1 border-l border-slate-800 pl-4">
                    {group.children.map((item) => (
                      <NavLink
                        key={item.path}
                        to={item.path}
                        className={childLinkClass}
                        onClick={() => {
                          setFlyoutSection(null);
                          closeMobile();
                        }}
                      >
                        {item.label}
                      </NavLink>
                    ))}
                  </div>
                ) : null}

                {isCompact && isFlyoutOpen && group.children ? (
                  <div className="absolute left-full top-0 z-50 ml-2 min-w-[12rem] rounded-xl border border-slate-800 bg-slate-950 p-2 shadow-xl shadow-black/40">
                    <p className="px-3 py-2 text-xs font-semibold uppercase tracking-wide text-orange-400/90">
                      {group.label}
                    </p>
                    {group.children.map((item) => (
                      <NavLink
                        key={item.path}
                        to={item.path}
                        className={childLinkClass}
                        onClick={() => {
                          setFlyoutSection(null);
                          closeMobile();
                        }}
                      >
                        {item.label}
                      </NavLink>
                    ))}
                  </div>
                ) : null}
              </div>
            );
          })}
        </nav>
      </aside>
    </>
  );
}

export default Sidebar;
