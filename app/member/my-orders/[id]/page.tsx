"use client";

import { useEffect, useMemo, useState } from "react";
import { useParams } from "next/navigation";
import {
	ArrowLeft,
	Circle,
	CircleCheckBig,
	Clock3,
	Download,
	MessageSquare,
	PackageOpen,
} from "lucide-react";
import {
	alpha,
	Avatar,
	Box,
	Button,
	Chip,
	Divider,
	Grid,
	Paper,
	Stack,
	Typography,
	CircularProgress,
} from "@mui/material";
import Sidebar from "../../../components/sidebar";
import Footer from "../../../components/footer";
import { estimatedFinish, timelineItems } from "../../../data/my-orders";
import { formatPeso } from "../../../lib/currency";
import { useLayoutShell } from "../../../providers/layout-shell-provider";
import type { TimelineStatus } from "../../../types/my-orders";

function timelineIcon(status: TimelineStatus) {
	if (status === "done") {
		return <CircleCheckBig size={17} />;
	}

	if (status === "current") {
		return <Clock3 size={17} />;
	}

	return <Circle size={17} />;
}

function timelineColor(status: TimelineStatus) {
	if (status === "done") {
		return "primary.main";
	}

	if (status === "current") {
		return "info.main";
	}

	return "text.disabled";
}

interface OrderServiceItem {
	id: string;
	label: string;
	quantity: number;
	unitLabel: string;
	lineTotal: number;
}

interface OrderDetails {
	services?: OrderServiceItem[];
	subtotal?: number;
	checkout?: {
		rewardDiscount?: number;
		logisticsFee?: number;
		serviceMethod?: string;
	};
}

export default function TrackOrderStatusPage() {
	const { navigate } = useLayoutShell();
	const params = useParams<{ id?: string }>();

	const orderId = useMemo(() => {
		const raw = Array.isArray(params?.id) ? params.id[0] : params?.id;
		const safe = raw ? decodeURIComponent(raw) : "WW-0000";
		return safe.replace(/^#/, "");
	}, [params]);

	const [order, setOrder] = useState<OrderDetails | null>(null);
	const [isLoading, setIsLoading] = useState(true);

	useEffect(() => {
		if (params?.id) {
			const id = Array.isArray(params.id) ? params.id[0] : params.id;
			fetch(`/api/member/order?id=${id}`)
				.then(res => res.json())
				.then(data => {
					if (data.success) setOrder(data.order);
					setIsLoading(false);
				})
				.catch(() => setIsLoading(false));
		}
	}, [params?.id]);

	const services = order?.services || [];
	const subtotal = order?.subtotal || 0;
	const rewardDiscount = order?.checkout?.rewardDiscount || 0;
	const logisticsFee = order?.checkout?.logisticsFee || 0;
	const totalAmount = subtotal + logisticsFee - rewardDiscount;

	if (isLoading) {
		return (
			<Box sx={{ minHeight: "100dvh", display: "flex", bgcolor: "background.default" }}>
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
				<Box sx={{ px: { xs: 1.5, sm: 2.5, md: 3.5 }, py: { xs: 1.5, md: 3 }, flex: 1 }}>
					<Stack direction="row" alignItems="center" justifyContent="space-between" flexWrap="wrap" rowGap={1} mb={1.8}>
						<Stack direction="row" alignItems="center" spacing={1}>
							<Button variant="outlined" size="small" startIcon={<ArrowLeft size={14} />} onClick={() => navigate("/member/my-orders")}>
								Back
							</Button>
							<Typography variant="h5" sx={{ fontWeight: 700, fontSize: { xs: 24, md: 30 } }}>
								Active Order Progress
							</Typography>
						</Stack>
						<Button variant="text" startIcon={<Download size={15} />}>
							Download Receipt
						</Button>
					</Stack>

					<Grid container spacing={2}>
						<Grid size={{ xs: 12, xl: 8.5 }}>
							<Paper elevation={0} sx={{ border: 1, borderColor: "divider", borderRadius: 2, overflow: "hidden" }}>
								<Box
									sx={{
										p: 1.8,
										display: "grid",
										gridTemplateColumns: { xs: "1fr", md: "1fr auto auto" },
										gap: 1.2,
										alignItems: "center",
										bgcolor: (theme) => alpha(theme.palette.primary.main, 0.06),
									}}
								>
									<Box>
										<Typography variant="caption" sx={{ textTransform: "uppercase", color: "text.secondary", fontWeight: 700 }}>
											Current Order
										</Typography>
										<Typography sx={{ fontWeight: 800, fontSize: 23, lineHeight: 1.2, color: "primary.main" }}>#{orderId}</Typography>
									</Box>
									<Box>
										<Typography variant="caption" sx={{ textTransform: "uppercase", color: "text.secondary", fontWeight: 700 }}>
											Estimated Finish
										</Typography>
										<Typography sx={{ fontWeight: 700 }}>{estimatedFinish}</Typography>
									</Box>
									<Chip label={order?.checkout?.serviceMethod === 'pickup' ? 'Delivery' : 'Drop-off'} color="info" size="small" sx={{ justifySelf: { xs: "flex-start", md: "flex-end" } }} />
								</Box>

								<Box sx={{ p: 2 }}>
									<Grid container spacing={2}>
										<Grid size={{ xs: 12, md: 7 }}>
											<Stack spacing={1.4}>
												{timelineItems.map((item) => (
													<Stack key={item.id} direction="row" spacing={1.2} alignItems="flex-start">
														<Avatar
															sx={{
																width: 28,
																height: 28,
																bgcolor: (theme) => alpha(theme.palette.primary.main, 0.12),
																color: timelineColor(item.status),
															}}
														>
															{timelineIcon(item.status)}
														</Avatar>
														<Box>
															<Typography sx={{ fontWeight: 700, lineHeight: 1.15 }}>{item.label}</Typography>
															<Typography variant="caption" color="text.secondary">
																{item.timestamp}
															</Typography>
														</Box>
													</Stack>
												))}
											</Stack>
										</Grid>

										<Grid size={{ xs: 12, md: 5 }}>
											<Paper variant="outlined" sx={{ p: 1.6, borderRadius: 2 }}>
												<Typography sx={{ fontWeight: 700, fontSize: 13.5, mb: 1 }}>Service Breakdown</Typography>
												<Stack spacing={0.8}>
													{services.map((item: OrderServiceItem) => (
														<Stack key={item.id} direction="row" justifyContent="space-between" spacing={1}>
															<Typography variant="body2" color="text.secondary">
																{item.label} ({item.quantity}{item.unitLabel})
															</Typography>
															<Typography variant="body2" sx={{ fontWeight: 700 }}>
																{formatPeso(item.lineTotal)}
															</Typography>
														</Stack>
													))}
													{logisticsFee > 0 && (
														<Stack direction="row" justifyContent="space-between" spacing={1}>
															<Typography variant="body2" color="text.secondary">
																Logistics Fee
															</Typography>
															<Typography variant="body2" sx={{ fontWeight: 700 }}>
																{formatPeso(logisticsFee)}
															</Typography>
														</Stack>
													)}
													{rewardDiscount > 0 && (
														<Stack direction="row" justifyContent="space-between" spacing={1}>
															<Typography variant="body2" color="secondary" sx={{ fontWeight: 700 }}>
																Loyalty Reward Applied
															</Typography>
															<Typography variant="body2" color="secondary" sx={{ fontWeight: 800 }}>
																-{formatPeso(rewardDiscount)}
															</Typography>
														</Stack>
													)}
												</Stack>
												<Divider sx={{ my: 1.2 }} />
												<Stack direction="row" justifyContent="space-between" alignItems="center">
													<Typography sx={{ fontWeight: 800 }}>Total Amount</Typography>
													<Typography sx={{ fontWeight: 800, color: "primary.main", fontSize: 28 }}>
														{formatPeso(totalAmount)}
													</Typography>
												</Stack>
											</Paper>

											<Button fullWidth variant="contained" sx={{ mt: 1.2 }} startIcon={<MessageSquare size={15} />}>
												Message Support
											</Button>
										</Grid>
									</Grid>
								</Box>
							</Paper>
						</Grid>

						<Grid size={{ xs: 12, xl: 3.5 }}>
							<Stack spacing={1.6}>
								<Paper elevation={0} sx={{ p: 1.8, border: 1, borderColor: "divider", borderRadius: 2 }}>
									<Stack direction="row" alignItems="center" spacing={1} mb={1}>
										<Avatar sx={{ width: 30, height: 30, bgcolor: (theme) => alpha(theme.palette.primary.main, 0.12), color: "primary.main" }}>
											<PackageOpen size={15} />
										</Avatar>
										<Typography sx={{ fontWeight: 700 }}>Order Stats</Typography>
									</Stack>
									<Grid container spacing={1}>
										<Grid size={12}>
											<Paper variant="outlined" sx={{ p: 1.2, textAlign: "center" }}>
												<Typography sx={{ fontWeight: 800, fontSize: 24, lineHeight: 1 }}>{services.length}</Typography>
												<Typography variant="caption" color="text.secondary">Total Services</Typography>
											</Paper>
										</Grid>
									</Grid>
								</Paper>

								<Paper
									elevation={0}
									sx={{
										p: 1.8,
										borderRadius: 2,
										color: "primary.contrastText",
										bgcolor: "primary.main",
										backgroundImage: (theme) =>
											`radial-gradient(circle at 80% 20%, ${alpha(theme.palette.common.white, 0.26)} 0, transparent 40%), radial-gradient(circle at 30% 100%, ${alpha(theme.palette.common.white, 0.2)} 0, transparent 34%)`,
									}}
								>
									<Typography sx={{ fontWeight: 700, mb: 0.6 }}>Quick Re-order?</Typography>
									<Typography variant="body2" sx={{ opacity: 0.92, mb: 1.2 }}>
										Place a new laundry order with one click using your last saved preferences.
									</Typography>
									<Button fullWidth variant="contained" color="inherit" sx={{ color: "primary.main", fontWeight: 700, backgroundColor: "white" }} onClick={() => navigate("/member/new-order")}
									>
										Start New Order
									</Button>
								</Paper>
							</Stack>
						</Grid>
					</Grid>
				</Box>

				<Footer />
			</Box>
		</Box>
	);
}
