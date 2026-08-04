"use client";

import React from "react";
import {
	Box,
	Paper,
	Typography,
	Grid,
	Stack,
	Avatar,
	Chip,
	alpha,
	CircularProgress,
	Alert,
	LinearProgress,
	IconButton,
} from "@mui/material";
import { Users, FileText, PackageCheck, Receipt, ArrowDown, ArrowUp, RefreshCcw, MapPin } from "lucide-react";
import Sidebar from "../../components/sidebar";
import Footer from "../../components/footer";
import { useDashboardStats } from "../../hooks/use-dashboard-stats";
import { useLayoutShell } from "../../providers/layout-shell-provider";
import type { AdminStatCard, Activity, ActivityStatus, DashboardAnalyticsMetric, AdminQuickStat } from "../../types/dashboard";

interface ExtendedActivity extends Activity {
	customer: string;
}



function statIcon(icon: string) {
	const iconProps = { size: 20, strokeWidth: 1.9 };

	switch (icon) {
		case "users":
			return <Users {...iconProps} />;
		case "orders":
			return <FileText {...iconProps} />;
		case "items":
			return <PackageCheck {...iconProps} />;
		default:
			return <Receipt {...iconProps} />;
	}
}

function statColor(accent: string) {
	switch (accent) {
		case "primary":
			return "primary";
		case "info":
			return "info";
		case "success":
			return "success";
		default:
			return "primary";
	}
}

function statusColor(status: ActivityStatus | string) {
	switch (status) {
		case "Processing":
			return "warning" as const;
		case "In Transit":
			return "info" as const;
		case "Ready":
			return "success" as const;
		case "Completed":
			return "default" as const;
		default:
			return "default" as const;
	}
}

function trendColor(direction?: string) {
	if (direction === "down") {
		return "error.main";
	}

	return "success.main";
}

function trendIcon(direction?: string) {
	if (direction === "down") {
		return <ArrowDown size={16} />;
	}

	return <ArrowUp size={16} />;
}

export default function AdminDashboardPage() {
	const { navigate } = useLayoutShell();
	const { data: dashboardData, loading, error, refresh: fetchDashboardData } = useDashboardStats();

	if (loading) {
		return (
			<Box sx={{ minHeight: "100dvh", display: "flex", bgcolor: "background.default" }}>
				<Sidebar />
				<Box component="main" sx={{ flex: 1, display: "flex", alignItems: "center", justifyContent: "center" }}>
					<CircularProgress />
				</Box>
			</Box>
		);
	}

	return (
		<Box sx={{ minHeight: "100dvh", display: "flex", bgcolor: "background.default" }}>
			<Sidebar />

			<Box
				component="main"
				sx={{
					flex: 1,
					minWidth: 0,
					display: "flex",
					flexDirection: "column",
				}}
			>
				<Box sx={{ px: { xs: 1.5, sm: 2, md: 3 }, py: { xs: 1.25, md: 2 }, flex: 1 }}>
					<Paper
						elevation={0}
						sx={{
							p: { xs: 1.5, md: 2 },
							borderRadius: 1.5,
							border: 1,
							borderColor: "divider",
							mb: 2,
							display: "flex",
							justifyContent: "space-between",
							alignItems: "center"
						}}
					>
						<Box sx={{ minWidth: 0 }}>
							<Typography variant="h5" sx={{ mb: 0.3, fontWeight: 700, fontSize: { xs: 20, md: 24 } }}>
								Dashboard
							</Typography>
							<Typography color="text.secondary" sx={{ fontSize: 13 }}>
								Real-time overview of your business metrics.
							</Typography>
						</Box>
						{/* Wrapped in IconButton so the control is keyboard-reachable and
						    meets the minimum touch-target size on mobile. */}
						<IconButton
							onClick={fetchDashboardData}
							aria-label="Refresh dashboard"
							sx={{ color: "text.secondary", flexShrink: 0, ml: 1 }}
						>
							<RefreshCcw size={20} />
						</IconButton>
					</Paper>

					{error && (
						<Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>
					)}

					{dashboardData && (
						<>
							<Grid container spacing={{ xs: 1.5, sm: 2 }} mb={2.5} columns={{ xs: 2, sm: 2, md: 4 }}>
								{dashboardData.stats.map((stat) => {
									const targetUrl = 
										stat.id === "customers" || stat.icon === "users"
											? "/admin/user-management"
											: stat.id === "orders" || stat.icon === "orders"
											? "/admin/progress-dashboard?status=in-progress"
											: "/admin/progress-dashboard?status=all";

									return (
										<Grid key={stat.id} size={{ xs: 1, sm: 1, md: 1 }}>
											<Paper
												elevation={0}
												onClick={() => navigate(targetUrl)}
												sx={{
													p: { xs: 2, sm: 2.25 },
													borderRadius: { xs: 3, md: 3.5 },
													border: 1,
													borderColor: (theme) => alpha(theme.palette.divider, 0.8),
													bgcolor: "background.paper",
													display: "flex",
													flexDirection: "column",
													alignItems: "center",
													justifyContent: "center",
													textAlign: "center",
													height: "100%",
													cursor: "pointer",
													boxShadow: (theme) =>
														theme.palette.mode === "dark"
															? "0 4px 12px rgba(0,0,0,0.25)"
															: "0 2px 8px rgba(0,0,0,0.03)",
													transition: "all 0.2s cubic-bezier(0.4, 0, 0.2, 1)",
													"&:hover": {
														transform: "translateY(-4px)",
														borderColor: (theme) => {
															const colorKey = statColor(stat.accent);
															const colorObj = (theme.palette as any)[colorKey];
															return alpha(colorObj?.main || theme.palette.primary.main, 0.6);
														},
														boxShadow: (theme) =>
															theme.palette.mode === "dark"
																? "0 8px 22px rgba(0,0,0,0.45)"
																: "0 8px 20px rgba(0,0,0,0.08)",
														"& .MuiAvatar-root": {
															transform: "scale(1.08)",
														},
													},
													"&:active": {
														transform: "translateY(-1px)",
													},
												}}
											>
												<Avatar
													sx={{
														width: { xs: 40, sm: 44 },
														height: { xs: 40, sm: 44 },
														mx: "auto",
														mb: 1.2,
														bgcolor: (theme) => {
															const colorKey = statColor(stat.accent);
															const colorObj = (theme.palette as any)[colorKey];
															return alpha(
																colorObj?.main || theme.palette.primary.main,
																theme.palette.mode === "dark" ? 0.2 : 0.12
															);
														},
														color: (theme) => {
															const colorKey = statColor(stat.accent);
															const colorObj = (theme.palette as any)[colorKey];
															return colorObj?.main || theme.palette.primary.main;
														},
														transition: "transform 0.2s ease",
													}}
												>
													{statIcon(stat.icon)}
												</Avatar>
												<Typography
													sx={{
														fontSize: { xs: 26, sm: 28, md: 30 },
														fontWeight: 800,
														lineHeight: 1.1,
														letterSpacing: "-0.02em",
														color: "text.primary",
													}}
												>
													{stat.value.toLocaleString()}
												</Typography>
												<Typography
													variant="caption"
													sx={{
														color: "text.secondary",
														fontWeight: 600,
														fontSize: { xs: 11.5, sm: 12.5 },
														mt: 0.5,
														lineHeight: 1.2,
														textAlign: "center",
													}}
												>
													{stat.label}
												</Typography>
											</Paper>
										</Grid>
									);
								})}
							</Grid>

							<Grid container spacing={1.5}>
								<Grid size={{ xs: 12, lg: 8 }}>
									<Paper elevation={0} sx={{ border: 1, borderColor: "divider", borderRadius: 1.5, p: 2 }}>
										<Typography variant="h6" sx={{ fontWeight: 700, fontSize: 18, mb: 1.5 }}>
											Data Analytics
										</Typography>
										<Stack spacing={1}>
											{dashboardData.analytics.map((metric) => (
												<Box key={metric.id} sx={{ p: 1.5, border: 1, borderColor: "divider", borderRadius: 1, bgcolor: "background.default" }}>
													<Stack direction="row" justifyContent="space-between" alignItems="center">
														<Stack>
															<Typography variant="caption" sx={{ color: "text.secondary", fontWeight: 700, mb: 0.3, fontSize: 11 }}>
																{metric.label}
															</Typography>
															<Typography sx={{ fontSize: 22, fontWeight: 800 }}>{metric.value}</Typography>
														</Stack>

														<Box sx={{ px: 1, py: 0.3, borderRadius: 1, bgcolor: metric.trendDirection === "down" ? "rgba(239, 68, 68, 0.08)" : "rgba(34, 197, 94, 0.08)", color: trendColor(metric.trendDirection) }}>
															<Typography sx={{ fontWeight: 700, fontSize: 12 }}>{metric.trend}</Typography>
														</Box>
													</Stack>
												</Box>
											))}
										</Stack>
									</Paper>
								</Grid>

								<Grid size={{ xs: 12, lg: 4 }}>
									<Paper elevation={0} sx={{ border: 1, borderColor: "divider", borderRadius: 1.5, p: 2, height: "100%" }}>
										<Typography variant="h6" sx={{ fontWeight: 700, fontSize: 16, mb: 1.2 }}>
											Quick Stats
										</Typography>
										<Stack spacing={1}>
											{dashboardData.quickStats.map((stat) => (
												<Box key={stat.id} sx={{ p: 1.2, borderRadius: 0.8, bgcolor: "background.default" }}>
													<Typography variant="caption" sx={{ color: "text.secondary", fontWeight: 700, display: "block", mb: 0.3, fontSize: 11 }}>
														{stat.label}
													</Typography>
													<Typography sx={{ fontWeight: 800, fontSize: 18 }}>{stat.value.toLocaleString()}</Typography>
												</Box>
											))}
										</Stack>
									</Paper>
								</Grid>
							</Grid>

							<Paper elevation={0} sx={{ border: 1, borderColor: "divider", borderRadius: 1.5, p: 2, mt: 1.5 }}>
								<Typography variant="h6" sx={{ fontWeight: 700, fontSize: 18, mb: 1.5 }}>
									Recent Orders
								</Typography>
								<Stack spacing={1}>
									{dashboardData.recentOrders.length > 0 ? (
										dashboardData.recentOrders.map((order) => (
											<Stack key={order.id} direction="row" alignItems="center" spacing={1} sx={{ p: 1, borderRadius: 1, border: 1, borderColor: "divider", bgcolor: "background.default" }}>
												<Avatar sx={{ width: 36, height: 36, bgcolor: "primary.light", color: "primary.contrastText" }}>
													<Receipt size={16} />
												</Avatar>
												<Box flex={1}>
													<Typography sx={{ fontWeight: 700, fontSize: 13 }}>{order.service}</Typography>
													<Typography variant="caption" color="text.secondary" sx={{ fontSize: 11 }}>
														Order {order.orderNumber} • {order.date} • {order.customer}
													</Typography>
												</Box>
												<Box textAlign="right">
													<Typography sx={{ fontWeight: 700, fontSize: 12 }}>{order.amount}</Typography>
													<Chip size="small" label={order.status} color={statusColor(order.status)} sx={{ mt: 0.3, height: 20 }} />
												</Box>
											</Stack>
										))
									) : (
										<Typography sx={{ textAlign: "center", py: 4, color: "text.secondary" }}>
											No orders found.
										</Typography>
									)}
								</Stack>
							</Paper>

							<Paper elevation={0} sx={{ border: 1, borderColor: "divider", borderRadius: 1.5, p: 2, mt: 1.5 }}>
								<Stack direction="row" justifyContent="space-between" alignItems="center" mb={1.5}>
									<Typography variant="h6" sx={{ fontWeight: 700, fontSize: 18 }}>
										Customer Demographics (Olongapo City)
									</Typography>
									<Typography variant="caption" sx={{ color: "text.secondary", fontWeight: 600 }}>
										By Barangay / Area
									</Typography>
								</Stack>
								<Stack spacing={1.2}>
									{dashboardData.demographics && dashboardData.demographics.length > 0 ? (
										dashboardData.demographics.map((demo, idx) => {
											const totalCust = dashboardData.stats.find(s => s.id === "customers")?.value || dashboardData.demographics.reduce((a, b) => a + b.count, 0);
											const pct = totalCust > 0 ? Math.round((demo.count / totalCust) * 100) : 0;
											return (
												<Box key={idx} sx={{ p: 1.2, borderRadius: 1, border: 1, borderColor: "divider", bgcolor: "background.default" }}>
													<Stack direction="row" alignItems="center" justifyContent="space-between" spacing={1.5}>
														<Stack direction="row" alignItems="center" spacing={1.5} flex={1}>
															<Avatar sx={{ width: 32, height: 32, bgcolor: "rgba(2, 132, 199, 0.12)", color: "primary.main" }}>
																<MapPin size={16} />
															</Avatar>
															<Box flex={1}>
																<Stack direction="row" justifyContent="space-between" alignItems="center" mb={0.4}>
																	<Typography sx={{ fontWeight: 700, fontSize: 14 }}>{demo.location}</Typography>
																	<Typography variant="caption" sx={{ fontWeight: 700, color: "text.secondary", fontSize: 11 }}>
																		{pct}% share
																	</Typography>
																</Stack>
																<LinearProgress
																	variant="determinate"
																	value={pct}
																	sx={{ height: 6, borderRadius: 3, bgcolor: "action.hover", "& .MuiLinearProgress-bar": { borderRadius: 3, bgcolor: "primary.main" } }}
																/>
															</Box>
														</Stack>
														<Chip size="small" label={`${demo.count} customer${demo.count === 1 ? "" : "s"}`} color="primary" sx={{ fontWeight: 700, ml: 1 }} />
													</Stack>
												</Box>
											);
										})
									) : (
										<Typography sx={{ textAlign: "center", py: 4, color: "text.secondary" }}>
											No demographic data found.
										</Typography>
									)}
								</Stack>
							</Paper>
						</>
					)}
				</Box>

				<Footer />
			</Box>
		</Box>
	);
}


