"use client";

import { useEffect, useState } from "react";
import {
	BadgeCheck,
	ClipboardList,
	Flame,
	PackageCheck,
	Receipt,
	Truck,
	Wind,
	Sparkles,
	Plus,
	ArrowRight,
	Gift,
	Search,
} from "lucide-react";
import {
	alpha,
	Avatar,
	Box,
	Button,
	Chip,
	Grid,
	InputAdornment,
	Paper,
	Stack,
	TextField,
	Typography,
	CircularProgress,
} from "@mui/material";
import { toast } from "react-toastify";
import Sidebar from "../../components/sidebar";
import Footer from "../../components/footer";
import RewardsModal from "../../components/RewardsModal";
import { useLayoutShell } from "../../providers/layout-shell-provider";
import { useOrder } from "../../hooks/use-order";
import { useRewards } from "../../hooks/use-rewards";
import { pusherClient } from "../../lib/pusher-client";
import type {
	Activity,
	ActivityStatus,
	PulseMetricAccent,
	PulseMetricIconName,
} from "../../types/dashboard";

function statusColor(status: ActivityStatus) {
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

function metricIcon(icon: PulseMetricIconName) {
	const iconProps = { size: 20, strokeWidth: 2 };

	switch (icon) {
		case "washing":
			return <Wind {...iconProps} />;
		case "drying":
			return <Flame {...iconProps} />;
		case "ironing":
			return <Sparkles {...iconProps} />;
		case "to-deliver":
			return <Truck {...iconProps} />;
		case "ready":
			return <PackageCheck {...iconProps} />;
		case "completed":
			return <BadgeCheck {...iconProps} />;
		default:
			return <Receipt {...iconProps} />;
	}
}

function metricColor(accent: PulseMetricAccent) {
	switch (accent) {
		case "primary":
			return "primary" as const;
		case "warning":
			return "warning" as const;
		case "secondary":
			return "secondary" as const;
		case "info":
			return "info" as const;
		case "success":
			return "success" as const;
		case "neutral":
			return "neutral" as const;
		default:
			return "primary" as const;
	}
}

interface PulseMetric {
	id: string | number;
	accent: PulseMetricAccent;
	icon: PulseMetricIconName;
	value: string | number;
	label: string;
}

export default function DashboardPage() {
	const { navigate } = useLayoutShell();
	const { fetchDashboard, isLoadingOrder } = useOrder();
	const [pulseMetrics, setPulseMetrics] = useState<PulseMetric[]>([]);
	const [activities, setActivities] = useState<Activity[]>([]);
	const [rewardsOpen, setRewardsOpen] = useState(false);
	const { summary } = useRewards();

	useEffect(() => {
		fetchDashboard().then((result) => {
			if (result.success) {
				setPulseMetrics(result.pulseMetrics);
				setActivities(result.activities);
			}
		});
	}, [fetchDashboard]);

	useEffect(() => {
		if (!pusherClient) return;

		const channel = pusherClient.subscribe("order-updates");
		
		channel.bind("order-status-updated", (data: { status?: string; serviceMethod?: string; orderId?: string }) => {
			console.log("Member Dashboard: Real-time update received!", data);
			
			let statusLabel = data.status;
			if (data.status === "ready") {
				statusLabel = data.serviceMethod === "pickup" ? "Ready for Delivery" : "Ready for Pickup";
			} else if (data.status === "closed") {
				statusLabel = "Finished";
			}

			toast.info(`Status Update: Order #${data.orderId?.slice(-6).toUpperCase()} is now ${statusLabel}`, {
				icon: <span>🧺</span>
			});
			fetchDashboard().then((result) => {
				if (result.success) {
					setPulseMetrics(result.pulseMetrics);
					setActivities(result.activities);
				}
			});
		});

		return () => {
			pusherClient.unsubscribe("order-updates");
		};
	}, [fetchDashboard]);

	if (isLoadingOrder && activities.length === 0) {
		return (
			<Box sx={{ display: "flex", bgcolor: "background.default", minHeight: "100dvh" }}>
				<Sidebar />
				<Box sx={{ flex: 1, display: "flex", justifyContent: "center", alignItems: "center" }}>
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
							p: { xs: 2, md: 2.5 },
							borderRadius: 2,
							border: 1,
							borderColor: "divider",
							mb: 2,
							bgcolor: (theme) => alpha(theme.palette.primary.main, theme.palette.mode === "dark" ? 0.15 : 0.08),
							display: "flex",
							flexDirection: { xs: "column", sm: "row" },
							alignItems: { xs: "flex-start", sm: "flex-start" },
							justifyContent: "space-between",
							gap: 2,
						}}
					>
						<Box sx={{ flex: 1 }}>
							<Typography variant="h5" sx={{ mb: 0.5, fontWeight: 700, fontSize: { xs: 20, md: 24 } }}>
								Need a fresh start?
							</Typography>
							<Typography color="text.secondary" sx={{ maxWidth: 660, fontSize: 13, lineHeight: 1.5 }}>
								Schedule a pickup now and we&apos;ll handle the rest. Our expert cleaners ensure your garments
								get the care they deserve.
							</Typography>
						</Box>
						<Button
							variant="contained"
							sx={{ px: 2, py: 0.9, borderRadius: 1, whiteSpace: "nowrap", flexShrink: 0 }}
							startIcon={<Plus size={16} />}
							onClick={() => navigate("/member/new-order")}
						>
							Start New Order
						</Button>
					</Paper>

					<Stack direction="row" alignItems="center" spacing={1} mb={1.5}>
						<Typography variant="h6" sx={{ fontWeight: 700, fontSize: 18 }}>
							Active Pulse
						</Typography>
						<Chip label="REAL-TIME" size="small" color="info" variant="outlined" />
					</Stack>

					<Grid container spacing={{ xs: 1.5, sm: 2 }} mb={2.5} columns={{ xs: 2, sm: 3, md: 5 }}>
						{pulseMetrics.map((metric) => {
							const targetFilter = 
								metric.label === "Total Orders"
									? "All"
									: metric.label === "In-Progress"
									? "in-progress"
									: metric.label === "Ready"
									? "ready"
									: metric.label === "In-Transit"
									? "out-for-delivery"
									: metric.label === "Completed"
									? "closed"
									: "All";

							return (
								<Grid key={metric.id} size={{ xs: 1, sm: 1, md: 1 }}>
									<Paper
										elevation={0}
										onClick={() => navigate(`/member/my-orders?status=${targetFilter}`)}
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
												borderColor: (theme) => alpha(theme.palette[metricColor(metric.accent)].main, 0.6),
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
												bgcolor: (theme) =>
													alpha(
														theme.palette[metricColor(metric.accent)].main,
														theme.palette.mode === "dark" ? 0.2 : 0.12
													),
												color: `${metricColor(metric.accent)}.main`,
												transition: "transform 0.2s ease",
											}}
										>
											{metricIcon(metric.icon)}
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
											{metric.value}
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
											{metric.label}
										</Typography>
									</Paper>
								</Grid>
							);
						})}
					</Grid>

					<Grid container spacing={1.5}>
						<Grid size={{ xs: 12, lg: 8 }}>
							<Typography variant="h6" sx={{ fontWeight: 700, fontSize: 18, mb: 1.2 }}>
								Recent Activities
							</Typography>

							<Paper elevation={0} sx={{ border: 1, borderColor: "divider", borderRadius: 1.5, p: 1.5, mb: 1.5 }}>
								<TextField
									size="small"
									placeholder="Track order number..."
									fullWidth
									sx={{
										"& .MuiOutlinedInput-root": {
											height: 36,
											borderRadius: 999,
											bgcolor: (theme) => alpha(theme.palette.text.primary, 0.06),
											"& fieldset": { borderColor: "transparent" },
											"&:hover fieldset": { borderColor: "transparent" },
											"&.Mui-focused fieldset": { borderColor: "transparent" },
										},
									}}
									InputProps={{
										startAdornment: (
											<InputAdornment position="start">
												<Search size={18} style={{ color: "#64748b" }} />
											</InputAdornment>
										),
									}}
								/>
							</Paper>

							<Paper elevation={0} sx={{ border: 1, borderColor: "divider", borderRadius: 1.5, p: 1.5 }}>
								{activities.length > 0 ? (
									<Stack spacing={1}>
										{activities.map((activity: Activity) => (
											<Stack key={activity.id} direction="row" alignItems="center" spacing={1} sx={{ p: 1, borderRadius: 1, border: 1, borderColor: "divider", bgcolor: "background.default" }}>
												<Avatar sx={{ width: 32, height: 32, bgcolor: "primary.light", color: "primary.contrastText" }}>
													<Receipt size={14} />
												</Avatar>
												<Box flex={1}>
													<Typography sx={{ fontWeight: 700, fontSize: 12 }}>{activity.service}</Typography>
													<Typography variant="caption" color="text.secondary" sx={{ fontSize: 10 }}>
														Order {activity.orderNumber} • {activity.date}
													</Typography>
												</Box>
												<Box textAlign="right">
													<Typography sx={{ fontWeight: 700, fontSize: 12 }}>{activity.amount}</Typography>
													<Chip size="small" label={activity.status} color={statusColor(activity.status)} sx={{ mt: 0.2, height: 18 }} />
												</Box>
											</Stack>
										))}
									</Stack>
								) : (
									<Box sx={{ py: 4, textAlign: "center" }}>
										<Typography color="text.secondary">No recent activities found.</Typography>
									</Box>
								)}
								<Button
									color="info"
									variant="text"
									size="small"
									fullWidth
									sx={{
										mt: 1,
										fontWeight: 700,
										fontSize: 12,
										"& .MuiButton-endIcon": { ml: 0.3 },
									}}
									endIcon={<ArrowRight size={14} />}
									onClick={() => navigate("/member/my-orders")}
								>
									View Order History
								</Button>
							</Paper>
						</Grid>

						<Grid size={{ xs: 12, lg: 4 }}>
							<Typography variant="h6" sx={{ fontWeight: 700, fontSize: 16, mb: 1.2 }}>
								Quick Shortcuts
							</Typography>
							<Stack spacing={1}>
								<Paper elevation={0} sx={{ p: 1.5, border: 1, borderColor: "divider", borderRadius: 1.5, cursor: "pointer", "&:hover": { bgcolor: "action.hover" } }} onClick={() => navigate("/member/new-order")}>
									<Avatar sx={{ width: 32, height: 32, mb: 1, bgcolor: "background.default", color: "text.primary" }}>
										<ClipboardList size={16} />
									</Avatar>
									<Typography sx={{ fontWeight: 700, fontSize: 13 }}>Flexible Scheduling</Typography>
									<Typography variant="body2" color="text.secondary" sx={{ fontSize: 12, mt: 0.3 }}>
										Choose your preferred pickup and delivery windows.
									</Typography>
								</Paper>
								<Paper elevation={0} sx={{ p: 1.5, border: 1, borderColor: "divider", borderRadius: 1.5, cursor: "pointer", "&:hover": { bgcolor: "action.hover" } }} onClick={() => navigate("/member/my-orders")}>
									<Avatar sx={{ width: 32, height: 32, mb: 1, bgcolor: "background.default", color: "text.primary" }}>
										<Truck size={16} />
									</Avatar>
									<Typography sx={{ fontWeight: 700, fontSize: 13 }}>Delivery Tracking</Typography>
									<Typography variant="body2" color="text.secondary" sx={{ fontSize: 12, mt: 0.3 }}>
										Follow your rider in real-time as they approach.
									</Typography>
								</Paper>
							</Stack>

							<Typography variant="h6" sx={{ fontWeight: 700, fontSize: 16, mt: 2.5, mb: 1.2 }}>
								Loyalty Rewards
							</Typography>
							<Paper 
								elevation={0} 
								sx={{ 
									p: 1.5, 
									borderRadius: 1.5, 
									color: "white",
									background: (theme) => `linear-gradient(135deg, ${theme.palette.primary.main} 0%, ${theme.palette.primary.dark} 100%)`,
									cursor: "pointer",
									"&:hover": { opacity: 0.95 }
								}} 
								onClick={() => setRewardsOpen(true)}
							>
								<Stack direction="row" spacing={1.5} alignItems="center">
									<Avatar sx={{ bgcolor: alpha("#fff", 0.2), color: "white" }}>
										<Gift size={20} />
									</Avatar>
									<Box>
										<Typography sx={{ fontWeight: 800, fontSize: 15 }}>{summary?.totalPoints || 0} Points</Typography>
										<Typography variant="body2" sx={{ opacity: 0.8, fontSize: 11 }}>
											Current Tier: {summary?.currentTier.toUpperCase() || "STARTER"}
										</Typography>
									</Box>
									<ArrowRight size={18} style={{ marginLeft: "auto" }} />
								</Stack>
							</Paper>
						</Grid>
					</Grid>
				</Box>

				<Footer />
			</Box>

			<RewardsModal open={rewardsOpen} onClose={() => setRewardsOpen(false)} />
		</Box>
	);
}
