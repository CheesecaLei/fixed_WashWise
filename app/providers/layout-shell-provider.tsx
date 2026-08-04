"use client";

import { createContext, useCallback, useContext, useMemo, useState, useSyncExternalStore } from "react";
import { useRouter } from "next/navigation";
import { memberLayoutData, adminLayoutData } from "../data/layout-shell";
import type { LayoutShellContextValue } from "../types/layout-shell";

const LayoutShellContext = createContext<LayoutShellContextValue | null>(null);

// Below this width the sidebar is replaced by a top bar + temporary drawer.
// Between this and `RAIL_QUERY` the desktop sidebar shows as an icon-only rail.
const DRAWER_QUERY = "(max-width:899.95px)";
const RAIL_QUERY = "(max-width:1199.95px)";

function useMediaQueryStore(query: string) {
  return useSyncExternalStore(
    (onStoreChange) => {
      const mediaQueryList = window.matchMedia(query);
      mediaQueryList.addEventListener("change", onStoreChange);

      return () => mediaQueryList.removeEventListener("change", onStoreChange);
    },
    () => window.matchMedia(query).matches,
    () => false,
  );
}

export function LayoutShellProvider({ children, userRole = "member" }: { children: React.ReactNode; userRole?: "member" | "admin" }) {
  const router = useRouter();
  const usesDrawer = useMediaQueryStore(DRAWER_QUERY);
  const prefersRail = useMediaQueryStore(RAIL_QUERY);
  // `null` = follow the viewport; once the user works the toggle their choice sticks.
  const [collapseOverride, setCollapseOverride] = useState<boolean | null>(null);
  const [drawerOpen, setDrawerOpen] = useState(false);

  // Tablet-width viewports get the icon rail by default. Below the drawer
  // breakpoint the nav lives in the drawer, always expanded, so it never
  // collapses there. Derived rather than synced in an effect, which also means
  // the drawer can't be left open when the layout switches back to a sidebar.
  const sidebarCollapsed = collapseOverride ?? (prefersRail && !usesDrawer);
  const mobileNavOpen = usesDrawer && drawerOpen;

  const setSidebarCollapsed = useCallback((collapsed: boolean) => setCollapseOverride(collapsed), []);
  const toggleSidebar = useCallback(() => setCollapseOverride(!sidebarCollapsed), [sidebarCollapsed]);
  const setMobileNavOpen = useCallback((open: boolean) => setDrawerOpen(open), []);
  const toggleMobileNav = useCallback(() => setDrawerOpen((prev) => !prev), []);

  const layoutData = userRole === "admin" ? adminLayoutData : memberLayoutData;

  const value = useMemo<LayoutShellContextValue>(
    () => ({
      brandName: layoutData.brandName,
      sidebarTitle: layoutData.sidebarTitle,
      accountTitle: layoutData.accountTitle,
      navItems: layoutData.navItems,
      accountItems: layoutData.accountItems,
      footerLinks: layoutData.footerLinks,
      sidebarCollapsed,
      setSidebarCollapsed,
      toggleSidebar,
      mobileNavOpen,
      setMobileNavOpen,
      toggleMobileNav,
      navigate: (href: string) => router.push(href),
    }),
    [
      router,
      sidebarCollapsed,
      setSidebarCollapsed,
      toggleSidebar,
      mobileNavOpen,
      setMobileNavOpen,
      toggleMobileNav,
      layoutData,
    ],
  );

  return <LayoutShellContext.Provider value={value}>{children}</LayoutShellContext.Provider>;
}

export function useLayoutShell() {
  const context = useContext(LayoutShellContext);
  if (!context) {
    throw new Error("useLayoutShell must be used inside LayoutShellProvider");
  }

  return context;
}
