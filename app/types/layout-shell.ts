export type SidebarIconName = "new-order" | "orders" | "profile" | "address" | "support" | "dashboard" | "services" | "user-management" | "progress" | "report" | "activities" | "scheduling" | "rewards";

export type SidebarNavItem = {
  id: string;
  label: string;
  icon: SidebarIconName;
  href: string;
  active?: boolean;
};

export type FooterLinkItem = {
  id: string;
  label: string;
  href: string;
};

export type LayoutShellContextValue = {
  brandName: string;
  sidebarTitle: string;
  accountTitle: string;
  navItems: SidebarNavItem[];
  accountItems: SidebarNavItem[];
  footerLinks: FooterLinkItem[];
  sidebarCollapsed: boolean;
  setSidebarCollapsed: (collapsed: boolean) => void;
  toggleSidebar: () => void;
  mobileNavOpen: boolean;
  setMobileNavOpen: (open: boolean) => void;
  toggleMobileNav: () => void;
  navigate: (href: string) => void;
};
