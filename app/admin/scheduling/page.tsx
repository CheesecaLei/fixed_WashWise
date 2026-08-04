"use client";

import { useState, useMemo } from "react";
import { 
	Calendar, 
	Clock, 
	Search, 
	MapPin, 
	Phone, 
	ChevronRight,
	CalendarDays,
	X
} from "lucide-react";
import {
	alpha,
	Box,
	Card,
	CardContent,
	Chip,
	Grid,
	InputAdornment,
	Stack,
	TextField,
	Typography,
	CircularProgress,
	Alert,
	Divider,
	Button,
	Paper,
	Avatar,
	Dialog,
	DialogTitle,
	DialogContent,
	DialogActions,
	Table,
	TableBody,
	TableCell,
	TableContainer,
	TableHead,
	TableRow,
	IconButton,
} from "@mui/material";
import Sidebar from "../../components/sidebar";
import Footer from "../../components/footer";
import PremiumPagination from "../../components/pagination";
import { useSchedules, type Schedule } from "../../hooks/use-schedules";
import { formatPeso } from "../../lib/currency";
import { toast } from "react-toastify";

export default function AdminSchedulingPage() {
	const { schedules, loading, error, page, setPage, pagination, updatePaymentStatus, refresh: refreshSchedules } = useSchedules();
	const [searchQuery, setSearchQuery] = useState("");
	const [selectedSchedule, setSelectedSchedule] = useState<Schedule | null>(null);
	const [detailsOpen, setDetailsOpen] = useState(false);
	const [updatingPaymentId, setUpdatingPaymentId] = useState<string | null>(null);

	// Custom MUI Confirmation Modal state
	const [noShowConfirmSchedule, setNoShowConfirmSchedule] = useState<Schedule | null>(null);
	const [isProcessingNoShow, setIsProcessingNoShow] = useState(false);

	const handleViewDetails = (schedule: Schedule) => {
		setSelectedSchedule(schedule);
		setDetailsOpen(true);
	};

	const handleCloseDetails = () => {
		setSelectedSchedule(null);
		setDetailsOpen(false);
	};

	const handleTogglePaymentStatus = async (schedule: Schedule) => {
		const newStatus = schedule.paymentStatus === "paid" ? "unpaid" : "paid";
		setUpdatingPaymentId(schedule.id);
		const result = await updatePaymentStatus(schedule.id, newStatus);
		setUpdatingPaymentId(null);
		if (result.success) {
			toast.success(`Payment status updated to ${newStatus}`);
			setSelectedSchedule(prev => prev ? { ...prev, paymentStatus: newStatus } : null);
		} else {
			toast.error(result.error || "Failed to update payment status");
		}
	};

	const handleOpenNoShowConfirm = (schedule: Schedule) => {
		setNoShowConfirmSchedule(schedule);
	};

	const handleExecuteNoShow = async () => {
		if (!noShowConfirmSchedule) return;
		setIsProcessingNoShow(true);
		try {
			const target = noShowConfirmSchedule;
			const res = await fetch("/api/admin/service-mng", {
				method: "PATCH",
				headers: { "Content-Type": "application/json" },
				body: JSON.stringify({ orderId: target.orderId || target.id, action: "mark-no-show" }),
			});
			const data = await res.json();
			if (res.ok && data.success) {
				toast.success(data.message || `Order #${target.orderCode} marked as No-Show.`);
				setSelectedSchedule(prev => (prev && (prev.id === target.id || prev.orderId === target.orderId)) ? { ...prev, status: "cancelled" } : prev);
				setNoShowConfirmSchedule(null);
				refreshSchedules();
			} else {
				toast.error(data.error || "Failed to mark order as No-Show.");
			}
		} catch (err) {
			toast.error("Error cancelling no-show schedule.");
			console.error(err);
		} finally {
			setIsProcessingNoShow(false);
		}
	};

	const filteredSchedules = useMemo(() => {
		if (!searchQuery) return schedules;
		const query = searchQuery.toLowerCase();
		return schedules.filter(s => 
			s.orderCode.toLowerCase().includes(query) ||
			s.customerName.toLowerCase().includes(query) ||
			s.address.toLowerCase().includes(query)
		);
	}, [schedules, searchQuery]);

	const groupedSchedules = useMemo(() => {
		const groups: Record<string, typeof filteredSchedules> = {};
		filteredSchedules.forEach(s => {
			const date = new Date(s.createdAt).toLocaleDateString("en-US", { 
				weekday: "long", 
				year: "numeric", 
				month: "long", 
				day: "numeric" 
			});
			if (!groups[date]) groups[date] = [];
			groups[date].push(s);
		});
		return groups;
	}, [filteredSchedules]);

	return (
		<Box sx={{ minHeight: "100dvh", display: "flex", bgcolor: "background.default" }}>
			<Sidebar isAdmin />

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
					<Stack
						direction={{ xs: "column", md: "row" }}
						justifyContent="space-between"
						alignItems={{ xs: "stretch", md: "center" }}
						gap={2}
						mb={{ xs: 2.5, md: 4 }}
					>
						<Box sx={{ minWidth: 0 }}>
							<Typography variant="h4" sx={{ fontWeight: 800, color: "text.primary", mb: 0.5 }}>
								Pickup & Delivery Schedule
							</Typography>
							<Typography variant="body2" color="text.secondary">
								Monitor and manage logistics for all active orders.
							</Typography>
						</Box>
						<TextField
							placeholder="Search schedules..."
							size="small"
							value={searchQuery}
							onChange={(e) => setSearchQuery(e.target.value)}
							InputProps={{
								startAdornment: (
									<InputAdornment position="start">
										<Search size={18} color="#94a3b8" />
									</InputAdornment>
								),
							}}
							sx={{
								width: { xs: "100%", md: 300 },
								flexShrink: 0,
								bgcolor: "background.paper",
								"& .MuiOutlinedInput-root": {
									borderRadius: 2
								}
							}}
						/>
					</Stack>

					{error && <Alert severity="error" sx={{ mb: 4 }}>{error}</Alert>}

					{loading && schedules.length === 0 ? (
						<Box sx={{ display: "flex", justifyContent: "center", py: 8 }}>
							<CircularProgress />
						</Box>
					) : (
						<Box>
							{Object.keys(groupedSchedules).length === 0 ? (
								<Paper sx={{ p: { xs: 4, md: 8 }, textAlign: "center", borderRadius: 3 }}>
									<CalendarDays size={48} color="#94a3b8" style={{ marginBottom: 16 }} />
									<Typography color="text.secondary" variant="h6">
										No schedules found for the current search.
									</Typography>
								</Paper>
							) : (
								Object.entries(groupedSchedules).map(([date, items]) => (
									<Box key={date} sx={{ mb: 4 }}>
										<Stack direction="row" alignItems="center" spacing={1} mb={2}>
											<Calendar size={18} color="#6366f1" />
											<Typography variant="subtitle1" sx={{ fontWeight: 700, color: "text.primary" }}>
												{date}
											</Typography>
											<Chip 
												label={`${items.length} Task${items.length > 1 ? "s" : ""}`} 
												size="small" 
												sx={{ fontWeight: 700, height: 20, fontSize: 10 }} 
											/>
										</Stack>

										<Grid container spacing={2}>
											{items.map((schedule) => (
												<Grid key={schedule.id} size={{ xs: 12, md: 6, lg: 4 }}>
													<Card sx={{ 
														borderRadius: 3, 
														boxShadow: "0 4px 20px rgba(0,0,0,0.04)",
														border: "1px solid",
														borderColor: "divider",
														position: "relative",
														overflow: "visible"
													}}>
														<Box sx={{ 
															position: "absolute", 
															top: -10, 
															right: 15,
															zIndex: 1
														}}>
															<Chip 
																label={schedule.serviceMethod === "pickup" ? "Logistics" : "Store Drop"}
																color={schedule.serviceMethod === "pickup" ? "primary" : "secondary"}
																size="small"
																sx={{ fontWeight: 800, px: 1 }}
															/>
														</Box>

														<CardContent sx={{ p: { xs: 2, md: 3 } }}>
															<Stack spacing={2}>
																<Stack direction="row" justifyContent="space-between" alignItems="flex-start" gap={1}>
																	<Box sx={{ minWidth: 0 }}>
																		<Typography variant="caption" color="text.secondary" sx={{ fontWeight: 700, textTransform: "uppercase" }}>
																			Order #{schedule.orderCode}
																		</Typography>
																		<Typography variant="h6" sx={{ fontWeight: 800, overflowWrap: "anywhere" }}>
																			{schedule.customerName}
																		</Typography>
																	</Box>
																	<Box sx={{ textAlign: "right", flexShrink: 0 }}>
																		<Typography variant="subtitle2" sx={{ fontWeight: 800, color: "primary.main" }}>
																			{formatPeso(schedule.finalTotal)}
																		</Typography>
																		<Stack direction="row" spacing={0.5} justifyContent="flex-end" flexWrap="wrap" useFlexGap sx={{ mt: 0.5 }}>
																			<Chip 
																				label={schedule.status} 
																				size="small" 
																				color={schedule.status === "cancelled" ? "error" : "default"}
																				variant={schedule.status === "cancelled" ? "filled" : "outlined"}
																				sx={{ height: 20, fontSize: 9, fontWeight: 700, textTransform: "capitalize" }}
																			/>
																			<Chip 
																				label={schedule.paymentStatus} 
																				size="small" 
																				color={schedule.paymentStatus === "paid" ? "success" : "warning"}
																				sx={{ height: 20, fontSize: 9, fontWeight: 700, textTransform: "capitalize" }}
																			/>
																		</Stack>
																	</Box>
																</Stack>

																<Divider />

																<Stack spacing={1.5}>
																	<Stack direction="row" spacing={1.5} alignItems="center">
																		<Avatar sx={{ width: 32, height: 32, bgcolor: alpha("#6366f1", 0.1), color: "#6366f1" }}>
																			<Clock size={16} />
																		</Avatar>
																		<Box>
																			<Typography variant="caption" color="text.secondary" sx={{ fontWeight: 700 }}>Time Slot</Typography>
																			<Typography variant="body2" sx={{ fontWeight: 600 }}>{schedule.selectedSlot}</Typography>
																		</Box>
																	</Stack>

																	<Stack direction="row" spacing={1.5} alignItems="center" sx={{ overflow: "hidden" }}>
																		<Avatar sx={{ width: 32, height: 32, bgcolor: alpha("#10b981", 0.1), color: "#10b981", flexShrink: 0 }}>
																			<MapPin size={16} />
																		</Avatar>
																		<Box sx={{ minWidth: 0, overflow: "hidden", flex: 1 }}>
																			<Typography variant="caption" color="text.secondary" sx={{ fontWeight: 700 }}>Address / Location</Typography>
																			<Typography variant="body2" sx={{ fontWeight: 600 }} noWrap title={schedule.address}>
																				{schedule.address}
																			</Typography>
																		</Box>
																	</Stack>

																	<Stack direction="row" spacing={1.5} alignItems="center">
																		<Avatar sx={{ width: 32, height: 32, bgcolor: alpha("#f59e0b", 0.1), color: "#f59e0b" }}>
																			<Phone size={16} />
																		</Avatar>
																		<Box>
																			<Typography variant="caption" color="text.secondary" sx={{ fontWeight: 700 }}>Contact Number</Typography>
																			<Typography variant="body2" sx={{ fontWeight: 600 }}>{schedule.customerPhone}</Typography>
																		</Box>
																	</Stack>
																</Stack>

																<Button 
																	variant="outlined" 
																	fullWidth 
																	size="small"
																	endIcon={<ChevronRight size={14} />}
																	onClick={() => handleViewDetails(schedule)}
																	sx={{ mt: 1, borderRadius: 2, fontWeight: 700 }}
																>
																	View Full Order
																</Button>
															</Stack>
														</CardContent>
													</Card>
												</Grid>
											))}
										</Grid>
									</Box>
								))
							)}
						</Box>
					)}

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
				</Box>
				<Footer />
			</Box>

			{/* Transaction Details Dialog */}
			<Dialog 
				open={detailsOpen} 
				onClose={handleCloseDetails}
				maxWidth="sm"
				fullWidth
				PaperProps={{
					sx: { borderRadius: 3, p: 1 }
				}}
			>
				{selectedSchedule && (
					<>
						<DialogTitle sx={{ m: 0, p: 2, display: "flex", justifyContent: "space-between", alignItems: "center" }}>
							<Box>
								<Typography variant="h6" sx={{ fontWeight: 800 }}>
									Order Details
								</Typography>
								<Typography variant="caption" color="text.secondary">
									Transaction ID: {selectedSchedule.id}
								</Typography>
							</Box>
							<IconButton onClick={handleCloseDetails} size="small">
								<X size={18} />
							</IconButton>
						</DialogTitle>
						<DialogContent dividers sx={{ p: 2 }}>
							<Grid container spacing={2} sx={{ mb: 3 }}>
								<Grid size={{ xs: 12, sm: 6 }}>
									<Stack spacing={1}>
										<Typography variant="caption" color="text.secondary" sx={{ fontWeight: 700, textTransform: "uppercase" }}>
											Customer Information
										</Typography>
										<Typography variant="body2" sx={{ fontWeight: 700 }}>
											{selectedSchedule.customerName}
										</Typography>
										<Typography variant="body2" color="text.secondary">
											Phone: {selectedSchedule.customerPhone}
										</Typography>
										<Typography variant="body2" color="text.secondary">
											Address: {selectedSchedule.address}
										</Typography>
									</Stack>
								</Grid>
								<Grid size={{ xs: 12, sm: 6 }}>
									<Stack spacing={1}>
										<Typography variant="caption" color="text.secondary" sx={{ fontWeight: 700, textTransform: "uppercase" }}>
											Order & Logistics
										</Typography>
										<Typography variant="body2">
											<strong>Order Code:</strong> #{selectedSchedule.orderCode}
										</Typography>
										<Typography variant="body2">
											<strong>Service Method:</strong> {selectedSchedule.serviceMethod === "pickup" ? "Delivery & Pickup" : "Store Drop-off"}
										</Typography>
										<Typography variant="body2">
											<strong>Time Slot:</strong> {selectedSchedule.selectedSlot}
										</Typography>
										<Typography variant="body2">
											<strong>Status:</strong> {selectedSchedule.status}
										</Typography>
										<Typography variant="body2">
											<strong>Placed On:</strong> {new Date(selectedSchedule.createdAt).toLocaleString("en-US", { dateStyle: "medium", timeStyle: "short" })}
										</Typography>
									</Stack>
								</Grid>
							</Grid>

							<Divider sx={{ my: 2 }} />

							<Typography variant="subtitle2" sx={{ fontWeight: 800, mb: 1.5 }}>
								Services Ordered
							</Typography>
							<TableContainer component={Paper} variant="outlined" sx={{ borderRadius: 2, mb: 3 }}>
								<Table size="small">
									<TableHead sx={{ bgcolor: "grey.50" }}>
										<TableRow>
											<TableCell sx={{ fontWeight: 700 }}>Service</TableCell>
											<TableCell align="right" sx={{ fontWeight: 700 }}>Qty</TableCell>
											<TableCell align="right" sx={{ fontWeight: 700 }}>Total</TableCell>
										</TableRow>
									</TableHead>
									<TableBody>
										{selectedSchedule.services && selectedSchedule.services.length > 0 ? (
											selectedSchedule.services.map((svc, idx: number) => (
												<TableRow key={idx}>
													<TableCell>{svc.label}</TableCell>
													<TableCell align="right">{svc.quantity} {svc.unitLabel}</TableCell>
													<TableCell align="right">{formatPeso(svc.lineTotal)}</TableCell>
												</TableRow>
											))
										) : (
											<TableRow>
												<TableCell colSpan={3} align="center">
													No services listed
												</TableCell>
											</TableRow>
										)}
									</TableBody>
								</Table>
							</TableContainer>

							<Divider sx={{ my: 2 }} />

							<Typography variant="subtitle2" sx={{ fontWeight: 800, mb: 1.5 }}>
								Financial Breakdown
							</Typography>
							<Stack spacing={1}>
								<Stack direction="row" justifyContent="space-between">
									<Typography variant="body2" color="text.secondary">Subtotal</Typography>
									<Typography variant="body2" sx={{ fontWeight: 600 }}>
										{formatPeso(
											selectedSchedule.services?.reduce((sum: number, s) => sum + (s.lineTotal || 0), 0) || 0
										)}
									</Typography>
								</Stack>
								{selectedSchedule.logisticsFee > 0 && (
									<Stack direction="row" justifyContent="space-between">
										<Typography variant="body2" color="text.secondary">Logistics Fee</Typography>
										<Typography variant="body2" sx={{ fontWeight: 600 }}>
											{formatPeso(selectedSchedule.logisticsFee)}
										</Typography>
									</Stack>
								)}
								{selectedSchedule.promoDiscount > 0 && (
									<Stack direction="row" justifyContent="space-between">
										<Typography variant="body2" color="success.main">Promo Discount</Typography>
										<Typography variant="body2" color="success.main" sx={{ fontWeight: 600 }}>
											-{formatPeso(selectedSchedule.promoDiscount)}
										</Typography>
									</Stack>
								)}
								{selectedSchedule.rewardDiscount > 0 && (
									<Stack direction="row" justifyContent="space-between">
										<Typography variant="body2" color="success.main">Loyalty Reward Discount</Typography>
										<Typography variant="body2" color="success.main" sx={{ fontWeight: 600 }}>
											-{formatPeso(selectedSchedule.rewardDiscount)}
										</Typography>
									</Stack>
								)}
								{selectedSchedule.loyaltyDiscount > 0 && (
									<Stack direction="row" justifyContent="space-between">
										<Typography variant="body2" color="success.main">Loyalty Tier Discount</Typography>
										<Typography variant="body2" color="success.main" sx={{ fontWeight: 600 }}>
											-{formatPeso(selectedSchedule.loyaltyDiscount)}
										</Typography>
									</Stack>
								)}
								<Divider sx={{ my: 0.5 }} />
								<Stack direction="row" justifyContent="space-between">
									<Typography variant="subtitle2" sx={{ fontWeight: 800 }}>Total Amount</Typography>
									<Typography variant="subtitle2" color="primary.main" sx={{ fontWeight: 800 }}>
										{formatPeso(selectedSchedule.finalTotal)}
									</Typography>
								</Stack>
							</Stack>

							<Divider sx={{ my: 2 }} />

							<Grid container spacing={2}>
								<Grid size={{ xs: 12, sm: 6 }}>
									<Typography variant="caption" color="text.secondary" sx={{ fontWeight: 700, display: "block" }}>
										Payment Method
									</Typography>
									<Typography variant="body2" sx={{ fontWeight: 700 }}>
										{selectedSchedule.paymentMethod}
									</Typography>
								</Grid>
								<Grid size={{ xs: 12, sm: 6 }}>
									<Typography variant="caption" color="text.secondary" sx={{ fontWeight: 700, display: "block", mb: 0.5 }}>
										Payment Status
									</Typography>
									<Stack direction="row" spacing={1} alignItems="center" flexWrap="wrap" useFlexGap>
										<Chip 
											label={selectedSchedule.paymentStatus} 
											size="small" 
											color={selectedSchedule.paymentStatus === "paid" ? "success" : "warning"}
											sx={{ fontWeight: 700, textTransform: "capitalize" }}
										/>
										<Button
											size="small"
											variant="outlined"
											color={selectedSchedule.paymentStatus === "paid" ? "error" : "success"}
											onClick={() => handleTogglePaymentStatus(selectedSchedule)}
											disabled={updatingPaymentId === selectedSchedule.id}
											sx={{ py: 0.25, px: 1, fontSize: 10, height: 24, fontWeight: 700 }}
										>
											{updatingPaymentId === selectedSchedule.id ? "..." : selectedSchedule.paymentStatus === "paid" ? "Mark Unpaid" : "Mark Paid"}
										</Button>
									</Stack>
								</Grid>
							</Grid>
						</DialogContent>
						<DialogActions sx={{ p: 2, justifyContent: "space-between" }}>
							<Button
								onClick={() => handleOpenNoShowConfirm(selectedSchedule)}
								variant="outlined"
								color="error"
								size="small"
								disabled={selectedSchedule.status === "cancelled" || selectedSchedule.status === "closed"}
								sx={{ fontWeight: 700, borderRadius: 2 }}
							>
								{selectedSchedule.status === "cancelled" ? "Already Cancelled" : "Mark Customer No-Show"}
							</Button>
							<Button onClick={handleCloseDetails} variant="contained" sx={{ borderRadius: 2 }}>
								Close
							</Button>
						</DialogActions>
					</>
				)}
			</Dialog>

			{/* Custom MUI Confirmation Dialog for No-Show */}
			<Dialog open={Boolean(noShowConfirmSchedule)} onClose={() => setNoShowConfirmSchedule(null)} maxWidth="xs" fullWidth PaperProps={{ sx: { borderRadius: 3 } }}>
				<DialogTitle sx={{ fontWeight: 800, pb: 1 }}>Confirm Customer No-Show</DialogTitle>
				<DialogContent>
					<Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
						Are you sure you want to mark Order <strong>#{noShowConfirmSchedule?.orderCode}</strong> as a customer No-Show? This will cancel the order and dispatch a cancellation email notification to the customer.
					</Typography>

					{noShowConfirmSchedule && (
						<Paper variant="outlined" sx={{ p: 1.5, borderRadius: 2, bgcolor: (theme) => alpha(theme.palette.error.main, 0.04), border: 1, borderColor: "error.light" }}>
							<Stack spacing={1}>
								<Box>
									<Typography variant="caption" color="text.secondary" sx={{ fontWeight: 700 }}>Customer</Typography>
									<Typography sx={{ fontWeight: 700, fontSize: 13 }}>{noShowConfirmSchedule.customerName}</Typography>
								</Box>
								<Box>
									<Typography variant="caption" color="text.secondary" sx={{ fontWeight: 700 }}>Service Method</Typography>
									<Typography sx={{ fontWeight: 700, fontSize: 13, textTransform: "capitalize" }}>
										{noShowConfirmSchedule.serviceMethod === "pickup" ? "Pickup & Delivery" : "Store Drop-off"}
									</Typography>
								</Box>
								<Box>
									<Typography variant="caption" color="text.secondary" sx={{ fontWeight: 700 }}>Time Slot</Typography>
									<Typography sx={{ fontWeight: 700, fontSize: 13 }}>{noShowConfirmSchedule.selectedSlot}</Typography>
								</Box>
							</Stack>
						</Paper>
					)}
				</DialogContent>
				<DialogActions sx={{ px: 3, pb: 2 }}>
					<Button onClick={() => setNoShowConfirmSchedule(null)} color="inherit" disabled={isProcessingNoShow}>
						Cancel
					</Button>
					<Button onClick={handleExecuteNoShow} variant="contained" color="error" disabled={isProcessingNoShow} sx={{ borderRadius: 2, fontWeight: 700 }}>
						{isProcessingNoShow ? "Cancelling..." : "Confirm No-Show & Cancel Order"}
					</Button>
				</DialogActions>
			</Dialog>
		</Box>
	);
}
