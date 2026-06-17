import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import { useLocation } from "react-router-dom";
import { getVisibleNavigation } from "../config/navigation";
import { getAuthRole } from "../utils/auth";

const SIDEBAR_COLLAPSED_KEY = "sidebarCollapsed";
const EXPANDED_SECTION_KEY = "expandedNavigationSection";

const SidebarContext = createContext(null);

const groupHasActiveChild = (group, pathname) =>
  group.children?.some(
    (item) => pathname === item.path || pathname.startsWith(`${item.path}/`)
  );

const readCollapsedState = () => localStorage.getItem(SIDEBAR_COLLAPSED_KEY) === "true";

const readExpandedSection = () => {
  const stored = localStorage.getItem(EXPANDED_SECTION_KEY);
  if (stored === null || stored === "null" || stored === "") {
    return null;
  }
  return stored;
};

export function SidebarProvider({ children }) {
  const { pathname } = useLocation();
  const role = getAuthRole();
  const navigation = useMemo(() => getVisibleNavigation(role), [role]);

  const [isCollapsed, setIsCollapsed] = useState(readCollapsedState);
  const [expandedSection, setExpandedSection] = useState(readExpandedSection);
  const [isMobileOpen, setIsMobileOpen] = useState(false);
  const [flyoutSection, setFlyoutSection] = useState(null);

  useEffect(() => {
    localStorage.setItem(SIDEBAR_COLLAPSED_KEY, String(isCollapsed));
  }, [isCollapsed]);

  useEffect(() => {
    localStorage.setItem(EXPANDED_SECTION_KEY, expandedSection ?? "null");
  }, [expandedSection]);

  useEffect(() => {
    const activeGroup = navigation.find((group) => groupHasActiveChild(group, pathname));

    if (activeGroup?.children) {
      setExpandedSection(activeGroup.label);
    }
  }, [pathname, navigation]);

  useEffect(() => {
    setIsMobileOpen(false);
    setFlyoutSection(null);
  }, [pathname]);

  useEffect(() => {
    if (!isCollapsed) {
      setFlyoutSection(null);
    }
  }, [isCollapsed]);

  const toggleCollapsed = useCallback(() => {
    setIsCollapsed((prev) => !prev);
    setFlyoutSection(null);
  }, []);

  const toggleSection = useCallback((label) => {
    setExpandedSection((prev) => (prev === label ? null : label));
    setFlyoutSection(null);
  }, []);

  const toggleMobile = useCallback(() => {
    setIsMobileOpen((prev) => !prev);
  }, []);

  const closeMobile = useCallback(() => {
    setIsMobileOpen(false);
  }, []);

  const toggleFlyout = useCallback((label) => {
    setFlyoutSection((prev) => (prev === label ? null : label));
  }, []);

  const value = useMemo(
    () => ({
      navigation,
      isCollapsed,
      isMobileOpen,
      expandedSection,
      flyoutSection,
      toggleCollapsed,
      toggleSection,
      toggleMobile,
      closeMobile,
      toggleFlyout,
      setFlyoutSection,
      groupHasActiveChild: (group) => groupHasActiveChild(group, pathname),
    }),
    [
      navigation,
      isCollapsed,
      isMobileOpen,
      expandedSection,
      flyoutSection,
      toggleCollapsed,
      toggleSection,
      toggleMobile,
      closeMobile,
      toggleFlyout,
      pathname,
    ]
  );

  return <SidebarContext.Provider value={value}>{children}</SidebarContext.Provider>;
}

export function useSidebar() {
  const context = useContext(SidebarContext);

  if (!context) {
    throw new Error("useSidebar must be used within SidebarProvider");
  }

  return context;
}

export default SidebarContext;
