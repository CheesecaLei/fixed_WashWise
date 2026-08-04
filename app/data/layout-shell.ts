import type { FooterLinkItem, SidebarNavItem } from "../types/layout-shell";

export const memberLayoutData: {
  brandName: string;
  sidebarTitle: string;
  accountTitle: string;
  navItems: SidebarNavItem[];
  accountItems: SidebarNavItem[];
  footerLinks: FooterLinkItem[];
} = {
  brandName: "Wash Wise",
  sidebarTitle: "MAIN MENU",
  accountTitle: "ACCOUNT",
  navItems: [
    {
      id: "new-order",
      label: "Dashboard",
      icon: "new-order",
      href: "/member/dashboard",
    },
    {
      id: "my-orders",
      label: "My Orders",
      icon: "orders",
      href: "/member/my-orders",
    },
  ],
  accountItems: [
    {
      id: "profile-settings",
      label: "Profile Settings",
      icon: "profile",
      href: "/member/profile",
    },
    {
      id: "saved-addresses",
      label: "Saved Addresses",
      icon: "address",
      href: "/member/addresses",
    },
    {
      id: "support-center",
      label: "WashPal AI",
      icon: "support",
      href: "/member/support",
    },
  ],
  footerLinks: [
    { id: "privacy", label: "Privacy Policy", href: "/privacy" },
    { id: "terms", label: "Terms of Service", href: "/terms" },
    { id: "help", label: "Help Center", href: "/help" },
  ],
};

export const adminLayoutData: {
  brandName: string;
  sidebarTitle: string;
  accountTitle: string;
  navItems: SidebarNavItem[];
  accountItems: SidebarNavItem[];
  footerLinks: FooterLinkItem[];
} = {
  brandName: "Wash Wise",
  sidebarTitle: "MAIN MENU",
  accountTitle: "",
  navItems: [
    {
      id: "dashboard",
      label: "Dashboard",
      icon: "dashboard",
      href: "/admin/dashboard",
    },
    {
      id: "scheduling",
      label: "Scheduling",
      icon: "scheduling",
      href: "/admin/scheduling",
    },
    {
      id: "progress-dashboard",
      label: "Progress Dashboard",
      icon: "progress",
      href: "/admin/progress-dashboard",
    },
    {
      id: "services",
      label: "Services",
      icon: "services",
      href: "/admin/services",
    },
    {
      id: "user-management",
      label: "User Management",
      icon: "user-management",
      href: "/admin/user-management",
    },
    {
      id: "activities",
      label: "Activities",
      icon: "activities",
      href: "/admin/activities",
    },
    {
      id: "report",
      label: "Report",
      icon: "report",
      href: "/admin/report",
    },
    {
      id: "support",
      label: "WashPal AI",
      icon: "support",
      href: "/admin/support",
    },
    {
      id: "rewards",
      label: "Loyalty Analytics",
      icon: "rewards",
      href: "/admin/rewards",
    },
  ],
  accountItems: [
  ],
  footerLinks: [
    { id: "privacy", label: "Privacy Policy", href: "/privacy" },
    { id: "terms", label: "Terms of Service", href: "/terms" },
    { id: "help", label: "Help Center", href: "/help" },
  ],
};

// For backward compatibility
export const layoutShellData = memberLayoutData;
