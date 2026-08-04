"use client";


import { Suspense, useEffect, useState, useMemo } from "react";
import { useSearchParams } from "next/navigation";
import {
	AlertCircle,
	Clock,
	CheckCircle2,
	Zap,
	Phone,
	Package,
	Truck,
	RefreshCcw,
	Loader2,
	FilterX,
	Camera,
	X,
	UserX,
	Scale,
} from "lucide-react";
import {
	alpha,
	Avatar,
	Box,
	Button,
	Grid,
	Paper,
	Stack,
	Typography,
	CircularProgress,
	Alert,
	IconButton,
	Chip,
	Dialog,
	DialogTitle,
	DialogContent,
	DialogActions,
	TextField,
} from "@mui/material";
import { toast } from "react-toastify";
import Sidebar from "../../components/sidebar";
import Footer from "../../components/footer";
import PremiumPagination from "../../components/pagination";
import { pusherClient } from "../../lib/pusher-client";
import { useOrderProgress } from "../../hooks/use-order-progress";
import type { OrderStatus } from "../../types/dashboard";

function getStatusIcon(status: OrderStatus) {
	const iconProps = { size: 14, strokeWidth: 1.9 };

	switch (status) {
		case "waiting":
			return <AlertCircle {...iconProps} />;
		case "in-progress":
			return <Clock {...iconProps} />;
		case "ready":
			return <Package {...iconProps} />;
		case "out-for-delivery":
			return <Truck {...iconProps} />;
		case "closed":
			return <CheckCircle2 {...iconProps} />;
		case "cancelled":
			return <UserX {...iconProps} />;
		default:
			return <Clock {...iconProps} />;
	}
}

function getStatusLabel(status: OrderStatus, serviceMethod?: string) {
	switch (status) {
		case "waiting":
			return "Waiting";
		case "in-progress":
			return "In Progress";
		case "ready":
			return serviceMethod === "pickup" ? "Ready for Delivery" : "Ready for Pickup";
		case "out-for-delivery":
			return "Out for Delivery";
		case "closed":
			return "Order Finished";
		case "cancelled":
			return "Cancelled (No-Show)";
		default:
			return status;
	}
}

function getStatusColor(status: OrderStatus) {
	switch (status) {
		case "waiting":
			return "#3f51b5";
		case "in-progress":
			return "#ff9800";
		case "ready":
			return "#4caf50";
		case "out-for-delivery":
			return "#00bcd4";
		case "closed":
			return "#9e9e9e";
		case "cancelled":
			return "#ef4444";
		default:
			return "#757575";
	}
}

function getProgressStatIcon(icon: string) {
	const iconProps = { size: 18, strokeWidth: 1.9 };

	switch (icon) {
		case "active":
			return <Zap {...iconProps} />;
		case "completed":
			return <CheckCircle2 {...iconProps} />;
		case "processing":
			return <Clock {...iconProps} />;
		default:
			return <Truck {...iconProps} />;
	}
}

function ProgressDashboardContent() {
	const { orders, stats, loading, error, updatingId, page, setPage, pagination, refresh: fetchData, updateStatus: handleStatusChange, verifyWeight } = useOrderProgress();
	const [weightModalOrder, setWeightModalOrder] = useState<{ id: string; code: string } | null>(null);
	const [newWeight, setNewWeight] = useState("");
	const [proofImage, setProofImage] = useState("");
	const [isSavingWeight, setIsSavingWeight] = useState(false);

	// No-Show Modal state
	const [noShowModalOrder, setNoShowModalOrder] = useState<any | null>(null);
	const [isProcessingNoShow, setIsProcessingNoShow] = useState(false);

	const handleOpenNoShowModal = (order: any) => {
		setNoShowModalOrder(order);
	};

	const handleConfirmNoShow = async () => {
		if (!noShowModalOrder) return;
		setIsProcessingNoShow(true);
		try {
			const res = await fetch("/api/admin/service-mng", {
				method: "PATCH",
				headers: { "Content-Type": "application/json" },
				body: JSON.stringify({ orderId: noShowModalOrder.id, action: "mark-no-show" }),
			});
			const data = await res.json();
			if (res.ok && data.success) {
				toast.success(data.message || `Order #${noShowModalOrder.orderCode} marked as No-Show.`);
				setNoShowModalOrder(null);
				fetchData();
			} else {
				toast.error(data.error || "Failed to mark order as No-Show.");
			}
		} catch (err) {
			toast.error("Error processing no-show cancellation.");
			console.error(err);
		} finally {
			setIsProcessingNoShow(false);
		}
	};

	const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
		const file = e.target.files?.[0];
		if (!file) return;

		if (!file.type.startsWith("image/")) {
			toast.error("Please upload a valid image file.");
			return;
		}

		if (file.size > 5 * 1024 * 1024) {
			toast.error("Image file size must be less than 5MB.");
			return;
		}

		const reader = new FileReader();
		reader.onload = (event) => {
			if (event.target?.result) {
				setProofImage(event.target.result as string);
			}
		};
		reader.readAsDataURL(file);
	};

	const handleSaveWeight = async () => {
		if (!weightModalOrder || !newWeight) return;
		const weightNum = parseFloat(newWeight);
		if (isNaN(weightNum) || weightNum <= 0) {
			toast.error("Please enter a valid weight in kg.");
			return;
		}
		setIsSavingWeight(true);
		const res = await verifyWeight(weightModalOrder.id, weightNum, proofImage || undefined);
		setIsSavingWeight(false);
		if (res.ok) {
			toast.success(`Verified weight (${weightNum} kg) for Order #${weightModalOrder.code}! Customer notified via email.`);
			setWeightModalOrder(null);
			setNewWeight("");
			setProofImage("");
		} else {
			toast.error(res.error || "Failed to verify weight.");
		}
	};
	const searchParams = useSearchParams();
	const [activeFilter, setActiveFilter] = useState<string>("all");

	const statusQuery = searchParams.get("status");

	useEffect(() => {
		if (statusQuery) {
			setActiveFilter(statusQuery.toLowerCase());
		}
	}, [statusQuery]);

	useEffect(() => {
		const notificationsChannel = pusherClient.subscribe("admin-notifications");
		const updatesChannel = pusherClient.subscribe("order-updates");

		notificationsChannel.bind("new-order", (data: { orderId?: string }) => {
			console.log("Real-time: New order for progress dashboard!", data);
			toast.info(`New Order Received! #${data.orderId?.slice(-6).toUpperCase() || "N/A"}`, {
				icon: <span>🧺</span>
			});
			fetchData();
		});

		updatesChannel.bind("order-status-updated", (data: { status?: string; serviceMethod?: string; orderId?: string }) => {
			console.log("Real-time: Order status updated!", data);
			
			let statusLabel = data.status || "";
			if (data.status === "ready") {
				statusLabel = data.serviceMethod === "pickup" ? "Ready for Delivery" : "Ready for Pickup";
			} else if (data.status === "closed") {
				statusLabel = "Finished";
			}

			toast.success(`Order #${data.orderId?.slice(-6).toUpperCase()} updated to ${statusLabel}`, {
				icon: <span>✅</span>
			});
			fetchData();
		});

		return () => {
			pusherClient.unsubscribe("admin-notifications");
			pusherClient.unsubscribe("order-updates");
		};
	}, [fetchData]);

	const filteredOrders = useMemo(() => {
		if (activeFilter === "all") return orders;
		if (activeFilter === "active" || activeFilter === "in-progress") {
			return orders.filter(o => ["waiting", "in-progress", "ready", "out-for-delivery"].includes(o.status));
		}
		if (activeFilter === "completed" || activeFilter === "closed") {
			return orders.filter(o => o.status === "closed");
		}
		if (activeFilter === "processing" || activeFilter === "waiting") {
			return orders.filter(o => ["waiting", "in-progress"].includes(o.status));
		}
		return orders.filter(o => o.status === activeFilter);
	}, [orders, activeFilter]);

	if (loading && orders.length === 0) {
		return (
			<Box sx={{ minHeight: "100dvh", display: "flex", bgcolor: "background.default" }}>
				<Sidebar />
				<Box component="main" sx={{ flex: 1, display: "flex", alignItems: "center", justifyContent: "center" }}>
					<CircularProgress />
				</Box>
			</Box>
		);
	}

	const orderStatusFlow: OrderStatus[] = ["waiting", "in-progress", "ready", "out-for-delivery", "closed"];

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
					<Stack direction="row" justifyContent="space-between" alignItems="flex-start" mb={2}>
						<Box>
							<Typography variant="h5" sx={{ fontWeight: 700, fontSize: { xs: 20, md: 24 }, mb: 0.3 }}>
								Progress Dashboard
							</Typography>
							<Typography color="text.secondary" sx={{ fontSize: 12 }}>
								Track and monitor progress metrics and order workflow.
							</Typography>
						</Box>
						<IconButton onClick={fetchData} disabled={loading} size="small">
							<RefreshCcw size={18} className={loading ? "animate-spin" : ""} />
						</IconButton>
					</Stack>

					{error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}

					<Grid container spacing={{ xs: 1.5, sm: 2 }} mb={2.5} columns={{ xs: 2, sm: 2, md: 4 }}>
						{stats.map((stat) => {
							const isSelected = activeFilter === stat.id || (activeFilter === "in-progress" && stat.id === "active");

							return (
								<Grid key={stat.id} size={{ xs: 1, sm: 1, md: 1 }}>
									<Paper
										elevation={0}
										onClick={() => setActiveFilter(prev => prev === stat.id ? "all" : stat.id)}
										sx={{
											p: { xs: 2, sm: 2.25 },
											borderRadius: { xs: 3, md: 3.5 },
											border: isSelected ? 2 : 1,
											borderColor: (theme) =>
												isSelected
													? theme.palette.primary.main
													: alpha(theme.palette.divider, 0.8),
											bgcolor: "background.paper",
											display: "flex",
											flexDirection: "column",
											alignItems: "center",
											justifyContent: "center",
											textAlign: "center",
											height: "100%",
											cursor: "pointer",
											boxShadow: (theme) =>
												isSelected
													? `0 0 0 3px ${alpha(theme.palette.primary.main, 0.2)}`
													: theme.palette.mode === "dark"
													? "0 4px 12px rgba(0,0,0,0.25)"
													: "0 2px 8px rgba(0,0,0,0.03)",
											transition: "all 0.2s cubic-bezier(0.4, 0, 0.2, 1)",
											"&:hover": {
												transform: "translateY(-4px)",
												borderColor: (theme) => {
													const colorKey = stat.color as "primary" | "secondary" | "success" | "error" | "info" | "warning";
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
													const colorKey = stat.color as "primary" | "secondary" | "success" | "error" | "info" | "warning";
													const colorObj = (theme.palette as any)[colorKey];
													return alpha(
														colorObj?.main || theme.palette.primary.main,
														theme.palette.mode === "dark" ? 0.2 : 0.12
													);
												},
												color: (theme) => {
													const colorKey = stat.color as "primary" | "secondary" | "success" | "error" | "info" | "warning";
													const colorObj = (theme.palette as any)[colorKey];
													return colorObj?.main || theme.palette.primary.main;
												},
												transition: "transform 0.2s ease",
											}}
										>
											{getProgressStatIcon(stat.icon)}
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
											{stat.value}
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

					<Paper elevation={0} sx={{ border: 1, borderColor: "divider", borderRadius: 1.5, p: 2 }}>
						<Stack direction="row" justifyContent="space-between" alignItems="center" mb={1.5}>
							<Typography variant="h6" sx={{ fontWeight: 700, fontSize: 18 }}>
								Live Order Tracking
							</Typography>
							{activeFilter !== "all" && (
								<Chip
									icon={<FilterX size={14} />}
									label={`Filter: ${activeFilter.toUpperCase()} (Clear)`}
									color="primary"
									size="small"
									variant="outlined"
									onClick={() => setActiveFilter("all")}
									sx={{ cursor: "pointer", fontWeight: 700 }}
								/>
							)}
						</Stack>

						<Stack spacing={1.5}>
							{filteredOrders.length > 0 ? (
								filteredOrders.map((order) => (
									<Paper
										key={order.id}
										elevation={0}
										sx={{
											border: 1,
											borderColor: "divider",
											borderRadius: 1.2,
											p: 1.5,
											bgcolor: "background.default",
											position: "relative",
											opacity: updatingId === order.id ? 0.6 : 1
										}}
									>
										{updatingId === order.id && (
											<Box sx={{ position: "absolute", top: 8, right: 8 }}>
												<Loader2 className="animate-spin" size={16} />
											</Box>
										)}
										<Grid container spacing={1.5}>
											<Grid size={{ xs: 12, sm: 6, md: 3 }}>
												<Stack spacing={0.5}>
													<Typography variant="caption" sx={{ color: "text.secondary", fontWeight: 700, fontSize: 10 }}>
														ORDER CODE
													</Typography>
													<Typography sx={{ fontWeight: 800, fontSize: 14, color: "primary.main" }}>
														{order.orderCode}
													</Typography>
												</Stack>
											</Grid>

											<Grid size={{ xs: 12, sm: 6, md: 3 }}>
												<Stack spacing={0.5}>
													<Typography variant="caption" sx={{ color: "text.secondary", fontWeight: 700, fontSize: 10 }}>
														CUSTOMER
													</Typography>
													<Typography sx={{ fontWeight: 700, fontSize: 13 }}>{order.customerName}</Typography>
													<Stack direction="row" spacing={0.5} alignItems="center">
														<Phone size={12} className="text-gray-400" />
														<Typography sx={{ fontSize: 11 }}>{order.customerPhone}</Typography>
													</Stack>
												</Stack>
											</Grid>

											<Grid size={{ xs: 12, sm: 6, md: 2 }}>
												<Stack spacing={0.5}>
													<Typography variant="caption" sx={{ color: "text.secondary", fontWeight: 700, fontSize: 10 }}>
														SERVICES
													</Typography>
													<Typography sx={{ fontWeight: 800, fontSize: 16 }}>{order.items}</Typography>
												</Stack>
											</Grid>

											<Grid size={{ xs: 12, sm: 6, md: 2 }}>
												<Stack spacing={0.5}>
													<Typography variant="caption" sx={{ color: "text.secondary", fontWeight: 700, fontSize: 10 }}>
														AMOUNT
													</Typography>
													<Typography sx={{ fontWeight: 800, fontSize: 14, color: "success.main" }}>
														{order.amount}
													</Typography>
													<Stack direction="row" spacing={0.5} alignItems="center">
														<Chip
															label={order.paymentStatus || "Pending"}
															size="small"
															color={(order.paymentStatus === "Paid" || order.paymentStatus === "Success") ? "success" : "warning"}
															sx={{ fontSize: 9, height: 18, fontWeight: 700 }}
														/>
														{order.rewardId && (
															<Chip 
																label={`\u20B1${order.rewardDiscount} Off`}
																size="small" 
																color="secondary" 
																variant="outlined"
																sx={{ fontSize: 9, height: 18, fontWeight: 800 }}
															/>
														)}
													</Stack>
												</Stack>
											</Grid>
										</Grid>

										<Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mt: 1.2, mb: 1 }}>
											<Typography sx={{ fontWeight: 700, fontSize: 12 }}>
												Update Order Status
											</Typography>
											<Stack direction="row" spacing={1}>
												<Button
													size="small"
													variant="outlined"
													color="info"
													startIcon={<Scale size={14} />}
													onClick={() => {
														setWeightModalOrder({ id: order.id, code: order.orderCode });
														setNewWeight("");
													}}
													sx={{ fontSize: 11, height: 26, fontWeight: 700 }}
												>
													Verify / Change Weight
												</Button>
												{order.status !== "closed" && order.status !== "cancelled" && (
													<Button
														size="small"
														variant="outlined"
														color="error"
														startIcon={<UserX size={14} />}
														onClick={() => handleOpenNoShowModal(order)}
														sx={{ fontSize: 11, height: 26, fontWeight: 700 }}
													>
														Mark No-Show
													</Button>
												)}
											</Stack>
										</Stack>

										<Box sx={{ display: "flex", gap: 0.6, flexWrap: "wrap", mb: 1.2 }}>
											{orderStatusFlow.map(
												(status) => {
													// Skip out-for-delivery if not a pickup order (logistics)
													if (status === "out-for-delivery" && order.serviceMethod !== "pickup") {
														return null;
													}
													
													const isActive = order.status === status;
													
													// Enforce linear progression: only allow active status or the immediate next status
													const isNextOrActive = (() => {
														if (isActive) return true;
														if (order.status === "waiting") {
															return status === "in-progress";
														}
														if (order.status === "in-progress") {
															return status === "ready";
														}
														if (order.status === "ready") {
															return order.serviceMethod === "pickup" ? status === "out-for-delivery" : status === "closed";
														}
														if (order.status === "out-for-delivery") {
															return status === "closed";
														}
														return false;
													})();

													return (
														<Button
															key={status}
															size="small"
															variant={isActive ? "contained" : "outlined"}
															onClick={() => handleStatusChange(order.id, status)}
															startIcon={getStatusIcon(status)}
															disabled={updatingId === order.id || !isNextOrActive}
															sx={{
																fontSize: 10,
																py: 0.4,
																px: 0.8,
																height: 28,
																bgcolor: isActive ? getStatusColor(status) : "transparent",
																color: isActive ? "white" : "inherit",
																borderColor: getStatusColor(status),
																"&:hover": {
																	bgcolor: isActive ? getStatusColor(status) : alpha(getStatusColor(status), 0.1),
																},
															}}
														>
															{getStatusLabel(status, order.serviceMethod)}
														</Button>
													);
												},
											)}
										</Box>

										<Stack direction="row" justifyContent="space-between">
											<Typography variant="caption" sx={{ color: "text.secondary", fontWeight: 700, fontSize: 10 }}>
												Order Date: {order.orderTime}
											</Typography>
											<Typography variant="caption" sx={{ color: "text.secondary", fontWeight: 700, fontSize: 10 }}>
												Last Updated: {order.estimatedCompletion}
											</Typography>
										</Stack>
									</Paper>
								))
							) : (
								<Typography sx={{ py: 4, textAlign: "center", color: "text.secondary" }}>
									No live orders found.
								</Typography>
							)}
						</Stack>

						{pagination && pagination.totalPages > 1 && (
							<PremiumPagination
								page={page}
								count={pagination.totalPages}
								onChange={(_, value) => setPage(value)}
								totalItems={pagination.total}
								rowsPerPage={pagination.limit}
								loading={loading}
							/>
						)}
					</Paper>
				</Box>

				{/* Weight Verification Dialog */}
				<Dialog open={Boolean(weightModalOrder)} onClose={() => { setWeightModalOrder(null); setProofImage(""); }} maxWidth="xs" fullWidth>
					<DialogTitle sx={{ fontWeight: 800, pb: 1 }}>
						Verify Order Weight — #{weightModalOrder?.code}
					</DialogTitle>
					<DialogContent>
						<Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
							Enter the verified weight measured at the facility scale and attach a proof image. Subtotal and totals will be automatically recalculated and sent to the customer.
						</Typography>

						<Stack spacing={2}>
							<TextField
								fullWidth
								label="Verified Weight (kg)"
								type="number"
								value={newWeight}
								onChange={(e) => setNewWeight(e.target.value)}
								placeholder="e.g. 7.5"
								size="small"
								autoFocus
								inputProps={{ step: "0.1", min: "0.5" }}
							/>

							<Box>
								<Typography variant="caption" sx={{ color: "text.secondary", fontWeight: 700, mb: 0.5, display: "block" }}>
									Scale Measurement Proof Photo (Optional)
								</Typography>
								{proofImage ? (
									<Box sx={{ position: "relative", borderRadius: 1.5, overflow: "hidden", border: 1, borderColor: "divider" }}>
										<img src={proofImage} alt="Scale proof" style={{ width: "100%", maxHeight: 180, objectFit: "cover", display: "block" }} />
										<IconButton
											size="small"
											onClick={() => setProofImage("")}
											sx={{ position: "absolute", top: 6, right: 6, bgcolor: "rgba(0,0,0,0.6)", color: "white", "&:hover": { bgcolor: "rgba(0,0,0,0.8)" } }}
										>
											<X size={14} />
										</IconButton>
									</Box>
								) : (
									<Button
										variant="outlined"
										component="label"
										fullWidth
										size="small"
										startIcon={<Camera size={16} />}
										sx={{ borderStyle: "dashed", py: 1.5, textTransform: "none", color: "text.secondary", fontWeight: 600 }}
									>
										Upload Scale Photo Proof
										<input type="file" accept="image/*" hidden onChange={handleImageUpload} />
									</Button>
								)}
							</Box>
						</Stack>
					</DialogContent>
					<DialogActions sx={{ p: 2, pt: 0 }}>
						<Button onClick={() => { setWeightModalOrder(null); setProofImage(""); }} variant="outlined" size="small" disabled={isSavingWeight}>
							Cancel
						</Button>
						<Button onClick={handleSaveWeight} variant="contained" color="primary" size="small" disabled={isSavingWeight} sx={{ fontWeight: 700 }}>
							{isSavingWeight ? "Saving..." : "Save & Verify"}
						</Button>
					</DialogActions>
				</Dialog>

				{/* No-Show Confirmation Dialog */}
				<Dialog open={Boolean(noShowModalOrder)} onClose={() => setNoShowModalOrder(null)} maxWidth="xs" fullWidth PaperProps={{ sx: { borderRadius: 3 } }}>
					<DialogTitle sx={{ fontWeight: 800, pb: 1 }}>Confirm Customer No-Show</DialogTitle>
					<DialogContent>
						<Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
							Are you sure you want to mark this order as a customer No-Show? This will cancel Order <strong>#{noShowModalOrder?.orderCode}</strong> and dispatch a cancellation email notification to the customer.
						</Typography>

						{noShowModalOrder && (
							<Paper variant="outlined" sx={{ p: 1.5, borderRadius: 2, bgcolor: (theme) => alpha(theme.palette.error.main, 0.04), border: 1, borderColor: "error.light" }}>
								<Stack spacing={1}>
									<Box>
										<Typography variant="caption" color="text.secondary" sx={{ fontWeight: 700 }}>Customer</Typography>
										<Typography sx={{ fontWeight: 700, fontSize: 13 }}>{noShowModalOrder.customerName}</Typography>
									</Box>
									<Box>
										<Typography variant="caption" color="text.secondary" sx={{ fontWeight: 700 }}>Service Method</Typography>
										<Typography sx={{ fontWeight: 700, fontSize: 13, textTransform: "capitalize" }}>{noShowModalOrder.serviceMethod || "Standard"}</Typography>
									</Box>
								</Stack>
							</Paper>
						)}
					</DialogContent>
					<DialogActions sx={{ px: 3, pb: 2 }}>
						<Button onClick={() => setNoShowModalOrder(null)} color="inherit" disabled={isProcessingNoShow}>
							Cancel
						</Button>
						<Button onClick={handleConfirmNoShow} variant="contained" color="error" disabled={isProcessingNoShow} sx={{ borderRadius: 2, fontWeight: 700 }}>
							{isProcessingNoShow ? "Cancelling..." : "Confirm No-Show & Cancel Order"}
						</Button>
					</DialogActions>
				</Dialog>

				<Footer />
			</Box>
		</Box>
	);
}

export default function ProgressDashboardPage() {
	return (
		<Suspense
			fallback={
				<Box sx={{ minHeight: "100dvh", display: "flex", bgcolor: "background.default" }}>
					<Box component="main" sx={{ flex: 1, display: "flex", alignItems: "center", justifyContent: "center", width: "100%" }}>
						<CircularProgress />
					</Box>
				</Box>
			}
		>
			<ProgressDashboardContent />
		</Suspense>
	);
}
