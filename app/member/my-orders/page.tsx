"use client";

import { Suspense, useEffect, useState, useMemo, useCallback } from "react";
import {
	CalendarClock,
	Circle,
	CircleCheckBig,
	Clock3,
	MessageSquare,
	PackageOpen,
	Truck,
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
	Table,
	TableBody,
	TableCell,
	TableHead,
	TableRow,
	Typography,
	CircularProgress,
	Menu,
	MenuItem,
	Tabs,
	Tab,
} from "@mui/material";
import { toast } from "react-toastify";
import { useSearchParams } from "next/navigation";
import Sidebar from "../../components/sidebar";
import Footer from "../../components/footer";
import PremiumPagination from "../../components/pagination";
import { formatPeso } from "../../lib/currency";
import { useLayoutShell } from "../../providers/layout-shell-provider";
import { useOrder } from "../../hooks/use-order";
import { pusherClient } from "../../lib/pusher-client";
import type { FetchTransactionsResponse } from "../../types/new-order";

type TimelineStatus = "done" | "current" | "pending";

function timelineIcon(status: TimelineStatus) {
	if (status === "done") return <CircleCheckBig size={17} />;
	if (status === "current") return <Clock3 size={17} />;
	return <Circle size={17} />;
}

function timelineColor(status: TimelineStatus) {
	if (status === "done") return "primary.main";
	if (status === "current") return "info.main";
	return "text.disabled";
}

function getStatusColor(status?: string) {
	switch (status?.toLowerCase()) {
		case "waiting":
			return "warning" as const;
		case "in-progress":
			return "info" as const;
		case "ready":
			return "success" as const;
		case "out-for-delivery":
			return "primary" as const;
		case "cancelled":
			return "error" as const;
		case "closed":
		case "completed":
			return "default" as const;
		default:
			return "default" as const;
	}
}

function getStatusLabel(status?: string, serviceMethod?: string) {
	switch (status?.toLowerCase()) {
		case "waiting":
			return "Awaiting Action";
		case "in-progress":
			return "In-Progress";
		case "ready":
			return serviceMethod === "pickup" ? "Ready for Delivery" : "Ready for Pickup";
		case "out-for-delivery":
			return "Out for Delivery";
		case "cancelled":
			return "Cancelled (No-Show)";
		case "closed":
		case "completed":
			return "Finished";
		default:
			return status || "Confirmed";
	}
}

interface PaginationData {
	total: number;
	totalPages: number;
	limit: number;
}

interface ServiceItem {
	label: string;
	lineTotal: number;
	unitLabel: string;
	quantity: number;
}

function MyOrdersContent() {
	const { navigate } = useLayoutShell();
	const searchParams = useSearchParams();
	const { fetchTransactions, isLoadingOrder } = useOrder();
	const [transactions, setTransactions] = useState<FetchTransactionsResponse["transactions"]>([]);
	const [page, setPage] = useState(1);
	const [pagination, setPagination] = useState<PaginationData | null>(null);
	const [filterAnchorEl, setFilterAnchorEl] = useState<null | HTMLElement>(null);
	const [filterStatus, setFilterStatus] = useState<string>("All");
	const [orderTab, setOrderTab] = useState(0);

	const statusQuery = searchParams.get("status");

	useEffect(() => {
		if (statusQuery) {
			const s = statusQuery.toLowerCase();
			if (s === "all") {
				setFilterStatus("All");
			} else if (s === "in-progress" || s === "processing" || s === "waiting") {
				setFilterStatus("In-Progress");
				setOrderTab(1);
			} else if (s === "ready") {
				setFilterStatus("Ready");
				setOrderTab(1);
			} else if (s === "out-for-delivery" || s === "in-transit") {
				setFilterStatus("In Transit");
				setOrderTab(1);
			} else if (s === "closed" || s === "completed" || s === "finished") {
				setFilterStatus("Finished");
				setOrderTab(1);
			} else {
				setFilterStatus(statusQuery);
				setOrderTab(1);
			}
		}
	}, [statusQuery]);

	const handleFilterClick = (event: React.MouseEvent<HTMLButtonElement>) => {
		setFilterAnchorEl(event.currentTarget);
	};
	
	const handleFilterClose = (status?: string) => {
		setFilterAnchorEl(null);
		if (status) setFilterStatus(status);
	};

	const loadData = useCallback((pageNum: number = 1) => {
		fetchTransactions(pageNum).then((result: { success: boolean; transactions?: FetchTransactionsResponse["transactions"]; pagination?: PaginationData }) => {
			if (result.success && result.transactions) {
				setTransactions(result.transactions);
				setPagination(result.pagination || null);
			}
		});
	}, [fetchTransactions]);

	useEffect(() => {
		loadData(page);
	}, [loadData, page]);

	useEffect(() => {
		if (!pusherClient) return;

		const channel = pusherClient.subscribe("order-updates");
		
		channel.bind("order-status-updated", (data: { status?: string; serviceMethod?: string; orderId?: string }) => {
			console.log("Member: Order status updated!", data);
			
			let statusLabel = data.status;
			if (data.status === "ready") {
				statusLabel = data.serviceMethod === "pickup" ? "Ready for Delivery" : "Ready for Pickup";
			} else if (data.status === "closed") {
				statusLabel = "Finished";
			}

			toast.info(`Your order #${data.orderId?.slice(-6).toUpperCase()} is now ${statusLabel}!`, {
				icon: <span>✨</span>
			});
			loadData(page);
		});

		return () => {
			pusherClient.unsubscribe("order-updates");
		};
	}, [loadData, page]);

	const currentTransaction = transactions && transactions.length > 0 ? transactions[0] : null;
	const currentOrderId = currentTransaction?._id.slice(-6).toUpperCase();

	const historyTransactions = useMemo(() => {
		if (!transactions) return [];
		let list = filterStatus === "All" ? (page === 1 ? transactions.slice(1) : transactions) : transactions;
		if (filterStatus !== "All") {
			list = list.filter(t => {
				const status = t.order?.status?.toLowerCase() || "";
				if (filterStatus === "Pending") return ["waiting", "in-progress", "ready", "out-for-delivery"].includes(status);
				if (filterStatus === "Finished") return ["closed", "completed"].includes(status);
				if (filterStatus === "In-Progress" || filterStatus === "in-progress") return ["waiting", "in-progress"].includes(status);
				if (filterStatus === "Ready" || filterStatus === "ready") return status === "ready";
				if (filterStatus === "In Transit" || filterStatus === "out-for-delivery") return status === "out-for-delivery";
				return status === filterStatus.toLowerCase();
			});
		}
		return list;
	}, [transactions, page, filterStatus]);

	const stats = useMemo(() => {
		if (!transactions) return { total: 0, weight: 0 };
		return {
			total: pagination?.total || transactions.length,
			weight: transactions.reduce((sum, t) => {
				const w = t.order?.services.reduce((s, item) => s + (item.unitLabel.toLowerCase().includes("kg") ? item.quantity : 0), 0) || 0;
				return sum + w;
			}, 0)
		};
	}, [transactions, pagination]);

	if (isLoadingOrder && (!transactions || transactions.length === 0)) {
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
					<Stack direction="row" alignItems="center" justifyContent="space-between" flexWrap="wrap" rowGap={1} mb={1.5}>
						<Typography variant="h6" sx={{ fontWeight: 700, fontSize: { xs: 18, md: 22 } }}>
							My Recent Order
						</Typography>
					</Stack>

					<Box sx={{ borderBottom: 1, borderColor: "divider", mb: 2 }}>
						<Tabs value={orderTab} onChange={(_, v) => setOrderTab(v)}>
							<Tab label="Recent Order" sx={{ textTransform: "none", fontWeight: 700 }} />
							<Tab label="Order History" sx={{ textTransform: "none", fontWeight: 700 }} />
						</Tabs>
					</Box>

					{transactions && transactions.length > 0 ? (
						<Grid container spacing={1.5}>
							<Grid size={{ xs: 12, xl: 8.5 }}>
								{/* Current Order Card */}
								{orderTab === 0 && (
								<Paper elevation={0} sx={{ border: 1, borderColor: "divider", borderRadius: 1.5, overflow: "hidden" }}>
									<Box
										sx={{
											p: 1.5,
											display: "grid",
											gridTemplateColumns: { xs: "1fr", md: "1fr auto auto" },
											gap: 1,
											alignItems: "center",
											bgcolor: (theme) => alpha(theme.palette.primary.main, 0.06),
										}}
									>
										<Box>
											<Typography variant="caption" sx={{ textTransform: "uppercase", color: "text.secondary", fontWeight: 700, fontSize: 10 }}>
												Most Recent Order
											</Typography>
											<Typography sx={{ fontWeight: 800, fontSize: 16, lineHeight: 1.2, color: "primary.main" }}>
												#{currentOrderId}
											</Typography>
										</Box>
										<Box>
											<Typography variant="caption" sx={{ textTransform: "uppercase", color: "text.secondary", fontWeight: 700, fontSize: 10 }}>
												Scheduled For
											</Typography>
											<Typography sx={{ fontWeight: 700, fontSize: 13 }}>{currentTransaction?.selectedSlot}</Typography>
										</Box>
										<Chip 
											label={getStatusLabel(currentTransaction?.order?.status, currentTransaction?.serviceMethod)} 
											color={getStatusColor(currentTransaction?.order?.status)} 
											size="small" 
											sx={{ justifySelf: { xs: "flex-start", md: "flex-end" }, height: 24, fontWeight: 700 }} 
										/>
									</Box>

									<Box sx={{ p: 1.5 }}>
										<Grid container spacing={1.5}>
											<Grid size={{ xs: 12, md: 7 }}>
												<Stack spacing={1}>
													{[
														{ id: 1, label: "Order Received", timestamp: new Date(currentTransaction?.createdAt || "").toLocaleString(), status: "done" as const },
														{ id: 2, label: "Awaiting Pickup/Drop-off", timestamp: "Tomorrow, " + currentTransaction?.selectedSlot, status: "current" as const },
														{ id: 3, label: "Cleaning in Progress", timestamp: "Pending", status: "pending" as const },
														{ id: 4, label: "Ready for Delivery", timestamp: "Pending", status: "pending" as const },
													].map((item) => (
														<Stack key={item.id} direction="row" spacing={1} alignItems="flex-start">
															<Avatar
																sx={{
																	width: 24,
																	height: 24,
																	bgcolor: (theme) => alpha(theme.palette.primary.main, 0.12),
																	color: timelineColor(item.status),
																	fontSize: 12,
																}}
															>
																{timelineIcon(item.status)}
															</Avatar>
															<Box>
																<Typography sx={{ fontWeight: 700, fontSize: 12, lineHeight: 1.2 }}>{item.label}</Typography>
																<Typography variant="caption" color="text.secondary" sx={{ fontSize: 10 }}>
																	{item.timestamp}
																</Typography>
															</Box>
														</Stack>
													))}
												</Stack>
											</Grid>

											<Grid size={{ xs: 12, md: 5 }}>
												<Paper variant="outlined" sx={{ p: 1.2, borderRadius: 1 }}>
													<Typography sx={{ fontWeight: 700, fontSize: 12, mb: 0.8 }}>Service Breakdown</Typography>
													<Stack spacing={0.6}>
														{currentTransaction?.order?.services.map((item: ServiceItem, idx: number) => (
															<Stack key={idx} direction="row" justifyContent="space-between" spacing={1}>
																<Typography variant="caption" color="text.secondary" sx={{ fontSize: 11 }}>
																	{item.label}
																</Typography>
																<Typography variant="caption" sx={{ fontWeight: 700, fontSize: 11 }}>
																	{formatPeso(item.lineTotal)}
																</Typography>
															</Stack>
														))}
														{currentTransaction && currentTransaction.logisticsFee > 0 && (
															<Stack direction="row" justifyContent="space-between" spacing={1}>
																<Typography variant="caption" color="text.secondary" sx={{ fontSize: 11 }}>Logistics Fee</Typography>
																<Typography variant="caption" sx={{ fontWeight: 700, fontSize: 11 }}>{formatPeso(currentTransaction.logisticsFee)}</Typography>
															</Stack>
														)}
														{currentTransaction && currentTransaction.promoDiscount > 0 && (
															<Stack direction="row" justifyContent="space-between" spacing={1}>
																<Typography variant="caption" color="success.main" sx={{ fontSize: 11 }}>Promo Discount</Typography>
																<Typography variant="caption" sx={{ fontWeight: 700, fontSize: 11, color: "success.main" }}>-{formatPeso(currentTransaction.promoDiscount)}</Typography>
															</Stack>
														)}
													</Stack>
													<Divider sx={{ my: 0.8 }} />
													<Stack direction="row" justifyContent="space-between" alignItems="center">
														<Typography sx={{ fontWeight: 700, fontSize: 12 }}>Total Amount</Typography>
														<Typography sx={{ fontWeight: 800, color: "primary.main", fontSize: 18 }}>
															{formatPeso(currentTransaction?.finalTotal || 0)}
														</Typography>
													</Stack>
												</Paper>

												<Button fullWidth variant="contained" size="small" sx={{ mt: 1, mb: 0.8 }} startIcon={<MessageSquare size={14} />}>
													Message Support
												</Button>

												<Button
													fullWidth
													variant="outlined"
													size="small"
													onClick={() => navigate(`/member/new-order/placed?transactionId=${currentTransaction?._id}`)}
												>
													View Full Details
												</Button>
											</Grid>
										</Grid>
									</Box>
								</Paper>
								)}

								{/* Older Orders Table */}
								{orderTab === 1 && (
								<Paper elevation={0} sx={{ border: 1, borderColor: "divider", borderRadius: 1.5, mt: 1.5, overflow: "hidden" }}>
									<Stack direction="row" alignItems="center" justifyContent="space-between" sx={{ p: 1.2 }}>
										<Typography sx={{ fontWeight: 700, fontSize: 14 }}>Order History</Typography>
										<Stack direction="row" spacing={0.8} flexWrap="wrap" useFlexGap>
											<Button size="small" variant="outlined" sx={{ py: 0.5 }} onClick={handleFilterClick}>
												Filter: {filterStatus}
											</Button>
											<Menu
												anchorEl={filterAnchorEl}
												open={Boolean(filterAnchorEl)}
												onClose={() => handleFilterClose()}
											>
												<MenuItem onClick={() => handleFilterClose("All")}>All</MenuItem>
												<MenuItem onClick={() => handleFilterClose("In-Progress")}>In-Progress</MenuItem>
												<MenuItem onClick={() => handleFilterClose("Ready")}>Ready</MenuItem>
												<MenuItem onClick={() => handleFilterClose("In Transit")}>In Transit</MenuItem>
												<MenuItem onClick={() => handleFilterClose("Finished")}>Finished</MenuItem>
												<MenuItem onClick={() => handleFilterClose("Pending")}>Pending</MenuItem>
											</Menu>
										</Stack>
									</Stack>

									<Box sx={{ overflowX: "auto" }}>
										<Table size="small" sx={{ minWidth: { xs: 620, md: 680 } }}>
											<TableHead>
												<TableRow>
													<TableCell sx={{ fontSize: 11, fontWeight: 700 }}>Order ID</TableCell>
													<TableCell sx={{ fontSize: 11, fontWeight: 700 }}>Date Placed</TableCell>
													<TableCell sx={{ fontSize: 11, fontWeight: 700 }}>Services</TableCell>
													<TableCell sx={{ fontSize: 11, fontWeight: 700 }}>Amount</TableCell>
													<TableCell sx={{ fontSize: 11, fontWeight: 700 }}>Status</TableCell>
													<TableCell align="right" sx={{ fontSize: 11, fontWeight: 700 }}>Action</TableCell>
												</TableRow>
											</TableHead>
											<TableBody>
												{historyTransactions.length > 0 ? (
													historyTransactions.map((item) => (
														<TableRow key={item._id} sx={{ "&:hover": { bgcolor: "background.default" } }}>
															<TableCell sx={{ fontWeight: 700, color: "primary.main", fontSize: 12 }}>#{item._id.slice(-6).toUpperCase()}</TableCell>
															<TableCell sx={{ fontSize: 12 }}>{new Date(item.createdAt).toLocaleDateString()}</TableCell>
															<TableCell sx={{ fontSize: 12 }}>{item.order?.services.map((s: ServiceItem) => s.label).join(", ")}</TableCell>
															<TableCell sx={{ fontWeight: 700, fontSize: 12 }}>{formatPeso(item.finalTotal)}</TableCell>
															<TableCell>
																<Chip 
																	size="small" 
																	label={getStatusLabel(item.order?.status, item.serviceMethod)} 
																	color={getStatusColor(item.order?.status)} 
																	sx={{ height: 20, fontSize: 10, fontWeight: 700 }} 
																/>
															</TableCell>
															<TableCell align="right">
																<Button size="small" variant="text" sx={{ fontSize: 11 }} onClick={() => navigate(`/member/new-order/placed?transactionId=${item._id}`)}>
																	Details
																</Button>
															</TableCell>
														</TableRow>
													))
												) : (
													<TableRow>
														<TableCell colSpan={6} align="center" sx={{ py: 3, color: "text.secondary" }}>
															No previous orders in history.
														</TableCell>
													</TableRow>
												)}
											</TableBody>
										</Table>
									</Box>

									{pagination && pagination.totalPages > 1 && (
										<Box sx={{ p: 1 }}>
											<PremiumPagination
												page={page}
												count={pagination.totalPages}
												onChange={(_, value) => setPage(value)}
												totalItems={pagination.total}
												rowsPerPage={pagination.limit}
												loading={isLoadingOrder}
											/>
										</Box>
									)}
								</Paper>
								)}
							</Grid>

							<Grid size={{ xs: 12, xl: 3.5 }}>
								<Stack spacing={1.2}>
									<Paper elevation={0} sx={{ p: 1.2, border: 1, borderColor: "divider", borderRadius: 1.5 }}>
										<Stack direction="row" alignItems="center" spacing={1} mb={1}>
											<Avatar sx={{ width: 28, height: 28, bgcolor: (theme) => alpha(theme.palette.primary.main, 0.12), color: "primary.main" }}>
												<PackageOpen size={14} />
											</Avatar>
											<Typography sx={{ fontWeight: 700, fontSize: 13 }}>Your Stats</Typography>
										</Stack>
										<Grid container spacing={0.8}>
											<Grid size={6}>
												<Paper variant="outlined" sx={{ p: 1, textAlign: "center", borderRadius: 1 }}>
													<Typography sx={{ fontWeight: 800, fontSize: 18, lineHeight: 1 }}>{stats.total}</Typography>
													<Typography variant="caption" color="text.secondary" sx={{ fontSize: 10 }}>Total Orders</Typography>
												</Paper>
											</Grid>
											<Grid size={6}>
												<Paper variant="outlined" sx={{ p: 1, textAlign: "center", borderRadius: 1 }}>
													<Typography sx={{ fontWeight: 800, fontSize: 18, lineHeight: 1 }}>{stats.weight}kg</Typography>
													<Typography variant="caption" color="text.secondary" sx={{ fontSize: 10 }}>Est. Weight</Typography>
												</Paper>
											</Grid>
										</Grid>
									</Paper>

									<Paper
										elevation={0}
										sx={{
											p: 1.2,
											borderRadius: 1.5,
											color: "primary.contrastText",
											bgcolor: "primary.main",
											backgroundImage: (theme) =>
												`radial-gradient(circle at 80% 20%, ${alpha(theme.palette.common.white, 0.26)} 0, transparent 40%), radial-gradient(circle at 30% 100%, ${alpha(theme.palette.common.white, 0.2)} 0, transparent 34%)`,
										}}
									>
										<Typography sx={{ fontWeight: 700, mb: 0.4, fontSize: 13 }}>Quick Re-order?</Typography>
										<Typography variant="body2" sx={{ opacity: 0.92, mb: 0.8, fontSize: 11 }}>
											Place a new laundry order with one click.
										</Typography>
										<Button
											fullWidth
											variant="contained"
											color="inherit"
											size="small"
											sx={{ color: "primary.main", fontWeight: 700, backgroundColor: "white", fontSize: 11, py: 0.6 }}
											onClick={() => navigate("/member/new-order")}
										>
											Start New Order
										</Button>
									</Paper>

									<Paper elevation={0} sx={{ p: 1.2, border: 1, borderColor: "divider", borderRadius: 1.5 }}>
										<Stack direction="row" alignItems="center" spacing={1} mb={0.6}>
											<CalendarClock size={14} />
											<Typography sx={{ fontWeight: 700, fontSize: 12 }}>Last Pickup Location</Typography>
										</Stack>
										<Typography variant="caption" sx={{ color: "text.secondary", textTransform: "uppercase", fontWeight: 700, fontSize: 10 }}>
											Address
										</Typography>
										<Typography sx={{ mt: 0.3, mb: 0.8, fontSize: 11 }}>
											{currentTransaction?.streetAddress || "No saved address"}, {currentTransaction?.barangay}, {currentTransaction?.city}
										</Typography>
										<Button fullWidth variant="outlined" size="small" sx={{ py: 0.5, fontSize: 11 }}>Update Preferences</Button>
									</Paper>

									<Paper elevation={0} sx={{ p: 1.2, border: 1, borderColor: "divider", borderRadius: 1.5 }}>
										<Stack direction="row" alignItems="center" spacing={1}>
											<Truck size={14} />
											<Box>
												<Typography sx={{ fontWeight: 700, fontSize: 12 }}>Pickup/Delivery Service</Typography>
												<Typography variant="caption" color="text.secondary" sx={{ fontSize: 10 }}>
													{currentTransaction?.serviceMethod === "pickup" ? "Full Logistics Support" : "Self Service Selected"}
												</Typography>
											</Box>
										</Stack>
									</Paper>
								</Stack>
							</Grid>
						</Grid>
					) : (
						<Paper sx={{ p: 6, textAlign: "center", borderRadius: 3, border: 1, borderColor: "divider" }}>
							<Box sx={{ mb: 2, color: "text.secondary" }}>
								<PackageOpen size={48} />
							</Box>
							<Typography variant="h6" sx={{ fontWeight: 700, mb: 1 }}>No Orders Yet</Typography>
							<Typography sx={{ color: "text.secondary", mb: 3 }}>You haven&apos;t placed any laundry orders yet. Start your first order now!</Typography>
							<Button variant="contained" onClick={() => navigate("/member/new-order")}>
								Start My First Order
							</Button>
						</Paper>
					)}
				</Box>

				<Footer />
			</Box>
		</Box>
	);
}

export default function MyOrdersPage() {
	return (
		<Suspense fallback={<Box sx={{ minHeight: "100dvh", display: "flex", alignItems: "center", justifyContent: "center", bgcolor: "background.default" }}><CircularProgress /></Box>}>
			<MyOrdersContent />
		</Suspense>
	);
}










