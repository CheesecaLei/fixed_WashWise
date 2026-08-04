"use client";

import { useEffect, useState } from "react";
import { Bot, CircleUserRound, ClipboardList, MapPin, Receipt, UserRound, ShoppingBasket, CircleQuestionMark, LayoutDashboard, FileText, Users, TrendingUp, Activity, Settings2, CalendarDays, Gift, Menu as MenuIcon, PanelLeftClose, PanelLeftOpen, LogOut, X, WifiOff } from "lucide-react";
import {
	Alert,
	AppBar,
	Avatar,
	Box,
	Button,
	Chip,
	Dialog,
	DialogActions,
	DialogContent,
	DialogContentText,
	DialogTitle,
	Divider,
	Drawer,
	GlobalStyles,
	IconButton,
	List,
	ListItemButton,
	ListItemIcon,
	ListItemText,
	Paper,
	Stack,
	Toolbar,
	Tooltip,
	Typography,
} from "@mui/material";
import { usePathname } from "next/navigation";
import Link from "next/link";
import { useLogout } from "../hooks/use-logout";
import { useLayoutShell } from "../providers/layout-shell-provider";
import { useOfflineStatus } from "../hooks/use-offline-status";
import { useProfile, type ProfileData } from "../hooks/use-profile";
import type { SidebarIconName, SidebarNavItem } from "../types/layout-shell";

/** Height of the mobile top bar; `main` is offset by this below the `md` breakpoint. */
const MOBILE_BAR_HEIGHT = 56;
const DRAWER_WIDTH = 272;
const SIDEBAR_WIDTH = 250;
const RAIL_WIDTH = 84;

function SidebarIcon({ icon, size = 16 }: { icon: SidebarIconName; size?: number }) {
	const iconProps = { size, strokeWidth: 1.9 };

	switch (icon) {
		case "new-order":
			return <ShoppingBasket {...iconProps} />;
		case "orders":
			return <ClipboardList {...iconProps} />;
		case "profile":
			return <UserRound {...iconProps} />;
		case "address":
			return <MapPin {...iconProps} />;
		case "support":
			return <Bot {...iconProps} />;
		case "dashboard":
			return <LayoutDashboard {...iconProps} />;
		case "report":
			return <FileText {...iconProps} />;
		case "user-management":
			return <Users {...iconProps} />;
		case "progress":
			return <TrendingUp {...iconProps} />;
		case "activities":
			return <Activity {...iconProps} />;
		case "services":
			return <Settings2 {...iconProps} />;
		case "scheduling":
			return <CalendarDays {...iconProps} />;
		case "rewards":
			return <Gift {...iconProps} />;
		default:
			return <Receipt {...iconProps} />;
	}
}

function normalizePath(path: string | null | undefined) {
	if (!path) {
		return "/";
	}

	if (path === "/") {
		return path;
	}

	return path.replace(/\/+$/, "");
}

export default function Sidebar({ isAdmin: _isAdmin }: { isAdmin?: boolean }) {
	const pathname = usePathname();
	const isOffline = useOfflineStatus();
	const { fetchProfile } = useProfile();
	const [profileUser, setProfileUser] = useState<ProfileData | null>(null);
	const [confirmLogoutOpen, setConfirmLogoutOpen] = useState(false);

	const {
		brandName,
		sidebarTitle,
		accountTitle,
		navItems,
		accountItems,
		sidebarCollapsed,
		toggleSidebar,
		mobileNavOpen,
		setMobileNavOpen,
	} = useLayoutShell();
	const { logout, isSubmitting, apiError } = useLogout();

	useEffect(() => {
		if (!isOffline) {
			fetchProfile().then((result) => {
				if (result.success) {
					setProfileUser(result.user);
				}
			});
		}
	}, [fetchProfile, isOffline]);

	const isAdmin = pathname.startsWith("/admin");

	function isItemActive(href: string) {
		const current = normalizePath(pathname);
		const target = normalizePath(href);

		if (target === "/") {
			return current === "/";
		}

		return current === target || current.startsWith(`${target}/`);
	}

	async function handleSignOut() {
		const result = await logout();

		if (!result.ok) {
			setConfirmLogoutOpen(false);
			return;
		}

		window.location.href = "/auth/login";
	}

	const activeItem = [...navItems, ...accountItems].find((item) => isItemActive(item.href));

	function renderNavList(items: SidebarNavItem[], compact: boolean, lockOffline: boolean) {
		return (
			<List dense disablePadding sx={{ py: 0.5 }}>
				{items.map((item) => {
					const isNewOrder = item.href === "/member/new-order";
					const isDisabled = isOffline && (lockOffline || !isNewOrder);

					return (
						<Tooltip
							key={item.id}
							title={isDisabled ? "Not available offline" : compact ? item.label : ""}
							placement="right"
						>
							<Box component="span" sx={{ display: "block" }}>
								<ListItemButton
									component={Link}
									href={item.href}
									selected={isItemActive(item.href)}
									disabled={isDisabled}
									onClick={(event: React.MouseEvent) => {
										if (isDisabled) {
											event.preventDefault();
											return;
										}
										setMobileNavOpen(false);
									}}
									sx={{
										borderRadius: 1,
										mb: 0.4,
										px: compact ? 0.8 : 1.2,
										// 44px keeps every row inside the recommended touch-target size.
										minHeight: compact ? 52 : 44,
										justifyContent: compact ? "center" : "flex-start",
										display: "flex",
										alignItems: "center",
										opacity: isDisabled ? 0.38 : 1,
										"&.Mui-selected": {
											bgcolor: "primary.main",
											color: "primary.contrastText",
											"&:hover": { bgcolor: "primary.dark" },
										},
									}}
								>
									<ListItemIcon
										sx={{
											minWidth: compact ? 0 : 30,
											color: "inherit",
											justifyContent: "center",
											width: compact ? "100%" : "auto",
											display: "flex",
										}}
									>
										<SidebarIcon icon={item.icon} size={compact ? 20 : 17} />
									</ListItemIcon>
									{!compact && (
										<ListItemText
											primary={item.label}
											slotProps={{ primary: { fontSize: 14, fontWeight: 600, noWrap: true } }}
										/>
									)}
								</ListItemButton>
							</Box>
						</Tooltip>
					);
				})}
			</List>
		);
	}

	/**
	 * Shared body for both presentations.
	 * `compact` renders the icon-only rail (desktop/tablet only — the drawer is
	 * always expanded so labels are readable on touch devices).
	 */
	function renderSidebarBody({
		compact,
		showClose,
		toggleSidebarBtn,
		isCollapsed,
	}: {
		compact: boolean;
		showClose?: boolean;
		toggleSidebarBtn?: boolean;
		isCollapsed?: boolean;
	}) {
		return (
			<>
				<Stack
					direction="row"
					alignItems="center"
					justifyContent="space-between"
					spacing={1}
					sx={{ px: compact ? 0 : 0.5, mb: 2, minHeight: 40 }}
				>
					<Stack
						direction="row"
						alignItems="center"
						spacing={1}
						sx={{ minWidth: 0, flex: 1, justifyContent: compact ? "center" : "flex-start" }}
					>
						<Avatar sx={{ bgcolor: "transparent", width: 32, height: 32, borderRadius: 1 }}>
							<Box
								component="img"
								src="/WASHWISE_LOGO-removebg-preview.png"
								alt="WashWise Logo"
								sx={{ width: "100%", height: "100%", objectFit: "contain" }}
							/>
						</Avatar>
						{!compact && (
							<Typography variant="h6" noWrap sx={{ fontSize: 20, fontWeight: 700, color: "primary.main" }}>
								{brandName}
							</Typography>
						)}
					</Stack>

					{showClose && (
						<IconButton onClick={() => setMobileNavOpen(false)} aria-label="Close navigation" size="small">
							<X size={20} />
						</IconButton>
					)}

					{toggleSidebarBtn && (
						<Tooltip title={isCollapsed ? "Expand sidebar" : "Collapse sidebar"} placement="right">
							<IconButton
								onClick={toggleSidebar}
								size="small"
								aria-label={isCollapsed ? "Expand sidebar" : "Collapse sidebar"}
								sx={{ color: "text.secondary", ml: compact ? 0 : 0.5 }}
							>
								{isCollapsed ? <PanelLeftOpen size={18} /> : <PanelLeftClose size={18} />}
							</IconButton>
						</Tooltip>
					)}
				</Stack>

				{isOffline && (
					<Box sx={{ mb: 1.5 }}>
						{compact ? (
							<Tooltip title="You're offline — only New Order is available" placement="right">
								<Box sx={{ display: "flex", justifyContent: "center" }}>
									<WifiOff size={18} style={{ color: "#ed6c02" }} />
								</Box>
							</Tooltip>
						) : (
							<Chip
								icon={<WifiOff size={14} />}
								label="Offline mode"
								size="small"
								color="warning"
								variant="outlined"
								sx={{ width: "100%", fontWeight: 700, fontSize: 11 }}
							/>
						)}
					</Box>
				)}

				<Box sx={{ flex: 1, minHeight: 0, overflowY: "auto", overflowX: "hidden", mx: compact ? 0 : -0.5, px: compact ? 0 : 0.5 }}>
					{!compact && sidebarTitle && (
						<Typography variant="caption" sx={{ color: "text.secondary", fontWeight: 700, px: 1 }}>
							{sidebarTitle}
						</Typography>
					)}
					{renderNavList(navItems, compact, false)}

					{accountItems.length > 0 && (
						<>
							<Divider sx={{ my: 1.5 }} />
							{!compact && accountTitle && (
								<Typography variant="caption" sx={{ color: "text.secondary", fontWeight: 700, px: 1 }}>
									{accountTitle}
								</Typography>
							)}
							{renderNavList(accountItems, compact, true)}
						</>
					)}
				</Box>

				<Box sx={{ pt: 2 }}>
					<Paper
						elevation={0}
						sx={{ p: 1.2, border: 1, borderColor: "divider", borderRadius: 2, bgcolor: "background.default" }}
					>
						<Stack direction="row" spacing={1.1} alignItems="center" justifyContent={compact ? "center" : "flex-start"}>
							<Avatar sx={{ width: 34, height: 34, bgcolor: "primary.main", flexShrink: 0 }}>
								<CircleUserRound size={18} />
							</Avatar>
							{!compact && (
								<Box sx={{ minWidth: 0 }}>
									<Typography noWrap sx={{ fontWeight: 700, fontSize: 13 }}>
										{profileUser?.username || "—"}
									</Typography>
									<Typography variant="caption" color="text.secondary" noWrap sx={{ display: "block" }}>
										{profileUser?.email || (isAdmin ? "Admin" : "Member")}
									</Typography>
								</Box>
							)}
						</Stack>
					</Paper>

					{compact ? (
						<Tooltip title="Sign Out" placement="right">
							<Box sx={{ display: "flex", justifyContent: "center", mt: 1.2 }}>
								<IconButton
									color="error"
									onClick={() => setConfirmLogoutOpen(true)}
									disabled={isSubmitting}
									aria-label="Sign out"
									sx={{ border: 1, borderColor: "divider", borderRadius: 1.3, width: 40, height: 40 }}
								>
									<LogOut size={18} />
								</IconButton>
							</Box>
						</Tooltip>
					) : (
						<Button
							fullWidth
							variant="outlined"
							color="error"
							startIcon={<LogOut size={16} />}
							sx={{ mt: 1.2, borderRadius: 1.3, minHeight: 42 }}
							onClick={() => setConfirmLogoutOpen(true)}
							disabled={isSubmitting}
						>
							{isSubmitting ? "Signing Out..." : "Sign Out"}
						</Button>
					)}

					{apiError && !compact && (
						<Alert severity="error" sx={{ mt: 1 }}>
							{apiError}
						</Alert>
					)}
				</Box>
			</>
		);
	}

	return (
		<>
			{/*
			 * The mobile bar is fixed so it survives page scroll, which means the
			 * page content needs to clear it. Every screen that renders <Sidebar />
			 * puts its content in a sibling <main>, so offset that.
			 */}
			<GlobalStyles
				styles={(theme) => ({
					[theme.breakpoints.down("md")]: {
						main: { paddingTop: `${MOBILE_BAR_HEIGHT}px` },
					},
				})}
			/>

			<AppBar
				position="fixed"
				elevation={0}
				color="inherit"
				sx={{
					display: { xs: "block", md: "none" },
					bgcolor: "background.paper",
					borderBottom: 1,
					borderColor: "divider",
				}}
			>
				<Toolbar disableGutters sx={{ minHeight: `${MOBILE_BAR_HEIGHT}px !important`, px: 1, gap: 0.5 }}>
					<IconButton onClick={() => setMobileNavOpen(true)} aria-label="Open navigation" sx={{ flexShrink: 0 }}>
						<MenuIcon size={22} />
					</IconButton>

					<Box sx={{ minWidth: 0, flex: 1 }}>
						<Typography noWrap sx={{ fontWeight: 700, fontSize: 15, lineHeight: 1.2 }}>
							{activeItem?.label || brandName}
						</Typography>
						{activeItem && (
							<Typography variant="caption" color="text.secondary" noWrap sx={{ display: "block", lineHeight: 1.2 }}>
								{brandName}
							</Typography>
						)}
					</Box>

					{isOffline && (
						<Tooltip title="You're offline — only New Order is available">
							<WifiOff size={20} style={{ color: "#ed6c02", flexShrink: 0 }} />
						</Tooltip>
					)}
					<Avatar sx={{ width: 32, height: 32, bgcolor: "primary.main", flexShrink: 0, ml: 0.5 }}>
						<CircleUserRound size={18} />
					</Avatar>
				</Toolbar>
			</AppBar>

			<Drawer
				open={mobileNavOpen}
				onClose={() => setMobileNavOpen(false)}
				ModalProps={{ keepMounted: true }}
				sx={{ display: { xs: "block", md: "none" } }}
				slotProps={{
					paper: {
						sx: {
							width: DRAWER_WIDTH,
							maxWidth: "85vw",
							px: 2,
							py: 2,
							display: "flex",
							flexDirection: "column",
						},
					},
				}}
			>
				{renderSidebarBody({ compact: false, showClose: true })}
			</Drawer>

			<Box
				component="aside"
				sx={{
					display: { xs: "none", md: "flex" },
					width: sidebarCollapsed ? RAIL_WIDTH : SIDEBAR_WIDTH,
					height: "100dvh",
					position: "sticky",
					top: 0,
					flexShrink: 0,
					borderRight: 1,
					borderColor: "divider",
					bgcolor: "background.paper",
					px: sidebarCollapsed ? 1.2 : 2,
					py: 2.5,
					flexDirection: "column",
					overflow: "hidden",
					transition: "width 0.2s ease",
				}}
			>
				{renderSidebarBody({ compact: sidebarCollapsed, toggleSidebarBtn: true, isCollapsed: sidebarCollapsed })}
			</Box>

			<Dialog
				open={confirmLogoutOpen}
				onClose={() => !isSubmitting && setConfirmLogoutOpen(false)}
				fullWidth
				maxWidth="xs"
				slotProps={{
					paper: { sx: { borderRadius: 3, p: 1, m: 2, width: "calc(100% - 32px)" } },
				}}
			>
				<DialogTitle sx={{ fontWeight: 700 }}>Confirm Logout</DialogTitle>
				<DialogContent>
					<DialogContentText>
						Are you sure you want to log out of your account? Any unsaved progress may be lost.
					</DialogContentText>
				</DialogContent>
				<DialogActions sx={{ px: 3, pb: 2, flexWrap: "wrap", gap: 1 }}>
					<Button
						variant="text"
						onClick={() => setConfirmLogoutOpen(false)}
						disabled={isSubmitting}
						sx={{
							color: "primary.main",
							fontWeight: 600,
							"&:hover": { color: "primary.dark", background: "rgba(0,0,0,0.05)" },
						}}
					>
						Cancel
					</Button>
					<Button
						onClick={handleSignOut}
						color="error"
						variant="contained"
						disabled={isSubmitting}
						sx={{ borderRadius: 1.5, px: 3 }}
					>
						{isSubmitting ? "Logging out..." : "Log Out"}
					</Button>
				</DialogActions>
			</Dialog>
		</>
	);
}
