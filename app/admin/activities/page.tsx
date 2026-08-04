"use client";

import React from "react";
import { CheckCircle2, AlertCircle, Truck, Activity, UserCog, UserMinus, RefreshCcw, Search, Filter, Calendar, UserPlus, LogIn, ShoppingCart, Gift, CreditCard, MessageSquare, User, PlusCircle, Edit, Trash, ArrowUp, ArrowDown, ArrowUpDown } from "lucide-react";
import {
	alpha,
	Avatar,
	Box,
	Grid,
	Paper,
	Stack,
	Typography,
	CircularProgress,
	Alert,
	IconButton,
	Table,
	TableBody,
	TableCell,
	TableContainer,
	TableHead,
	TableRow,
	TextField,
	Select,
	MenuItem,
	InputAdornment,
	Chip,
	FormControl,
	InputLabel
} from "@mui/material";
import Sidebar from "../../components/sidebar";
import Footer from "../../components/footer";
import PremiumPagination from "../../components/pagination";
import { useActivities } from "../../hooks/use-activities";


function getActivityIcon(type: string) {
	const iconProps = { size: 18, strokeWidth: 1.9 };

	switch (type) {
		case "order-received":
			return <AlertCircle {...iconProps} />;
		case "order-completed":
			return <CheckCircle2 {...iconProps} />;
		case "delivery-completed":
			return <Truck {...iconProps} />;
		case "order-delayed":
			return <Activity {...iconProps} />;
		case "user-updated":
			return <UserCog {...iconProps} />;
		case "user-deleted":
			return <UserMinus {...iconProps} />;
		case "user-signup":
			return <UserPlus {...iconProps} />;
		case "user-login":
			return <LogIn {...iconProps} />;
		case "order-placed":
			return <ShoppingCart {...iconProps} />;
		case "reward-redeemed":
			return <Gift {...iconProps} />;
		case "payment-updated":
			return <CreditCard {...iconProps} />;
		case "support-ticket-created":
		case "support-ticket-updated":
		case "support-ticket-replied":
			return <MessageSquare {...iconProps} />;
		case "profile-updated":
			return <User {...iconProps} />;
		case "service-created":
			return <PlusCircle {...iconProps} />;
		case "service-updated":
			return <Edit {...iconProps} />;
		case "service-deleted":
			return <Trash {...iconProps} />;
		default:
			return <Activity {...iconProps} />;
	}
}

function getActivityColor(type: string) {
	switch (type) {
		case "order-received":
			return "primary";
		case "order-completed":
			return "success";
		case "delivery-completed":
			return "info";
		case "order-delayed":
			return "warning";
		case "user-updated":
			return "secondary";
		case "user-deleted":
			return "error";
		case "user-signup":
			return "success";
		case "user-login":
			return "secondary";
		case "order-placed":
			return "primary";
		case "reward-redeemed":
			return "warning";
		case "payment-updated":
			return "success";
		case "support-ticket-created":
		case "support-ticket-updated":
		case "support-ticket-replied":
			return "info";
		case "profile-updated":
			return "primary";
		case "service-created":
			return "success";
		case "service-updated":
			return "warning";
		case "service-deleted":
			return "error";
		default:
			return "neutral";
	}
}

function getActivityLabel(type: string) {
	switch (type) {
		case "order-received":
			return "Order Received";
		case "order-completed":
			return "Order Completed";
		case "delivery-completed":
			return "Delivery Completed";
		case "order-delayed":
			return "Order Delayed";
		case "user-updated":
			return "User Account Updated";
		case "user-deleted":
			return "User Account Deleted";
		case "user-signup":
			return "New Account Created";
		case "user-login":
			return "User Logged In";
		case "order-placed":
			return "Order Placed";
		case "reward-redeemed":
			return "Reward Redeemed";
		case "payment-updated":
			return "Payment Updated";
		case "support-ticket-created":
			return "Support Ticket Created";
		case "support-ticket-updated":
			return "Support Ticket Updated";
		case "support-ticket-replied":
			return "Support Ticket Replied";
		case "profile-updated":
			return "Profile Updated";
		case "service-created":
			return "Service Created";
		case "service-updated":
			return "Service Updated";
		case "service-deleted":
			return "Service Deleted";
		default:
			return "System Activity";
	}
}

export default function ActivitiesPage() {
	const { 
		logs, 
		loading, 
		error, 
		page, 
		setPage, 
		pagination, 
		searchQuery,
		setSearchQuery,
		typeFilter,
		setTypeFilter,
		timeframeFilter,
		setTimeframeFilter,
		sortOrder,
		setSortOrder,
		refresh: fetchLogs 
	} = useActivities();

	if (loading && logs.length === 0) {
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
					<Stack direction="row" justifyContent="space-between" alignItems="flex-start" mb={2}>
						<Box>
							<Typography variant="h5" sx={{ fontWeight: 700, fontSize: { xs: 20, md: 24 }, mb: 0.3 }}>
								Activities
							</Typography>
							<Typography color="text.secondary" sx={{ fontSize: 12 }}>
								View and manage system activities and logs.
							</Typography>
						</Box>
						<IconButton onClick={fetchLogs} disabled={loading} size="small">
							<RefreshCcw size={18} className={loading ? "animate-spin" : ""} />
						</IconButton>
					</Stack>

					{error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}

					<Paper elevation={0} sx={{ border: 1, borderColor: "divider", borderRadius: 1.5, p: { xs: 1.5, md: 2.5 } }}>
						<Stack direction={{ xs: "column", md: "row" }} spacing={2} mb={3} alignItems="center" justifyContent="space-between">
							<Typography variant="h6" sx={{ fontWeight: 700, fontSize: 18, alignSelf: { xs: "flex-start", md: "center" } }}>
								Recent Activities
							</Typography>
							<Stack direction={{ xs: "column", sm: "row" }} spacing={1.5} sx={{ width: { xs: "100%", md: "auto" } }}>
								<TextField
									placeholder="Search by User, Code..."
									size="small"
									value={searchQuery}
									onChange={(e) => setSearchQuery(e.target.value)}
									InputProps={{
										startAdornment: (
											<InputAdornment position="start">
												<Search size={16} className="text-gray-400" />
											</InputAdornment>
										),
									}}
									sx={{ minWidth: 200, "& .MuiOutlinedInput-root": { bgcolor: "background.default" } }}
								/>
								<FormControl size="small" sx={{ minWidth: 150 }}>
									<InputLabel>Category</InputLabel>
									<Select
										value={typeFilter}
										label="Category"
										onChange={(e) => setTypeFilter(e.target.value)}
										sx={{ bgcolor: "background.default" }}
									>
										<MenuItem value="all">All Activities</MenuItem>
										<MenuItem value="user-signup">User Signup</MenuItem>
										<MenuItem value="user-login">User Login</MenuItem>
										<MenuItem value="order-placed">Order Placed</MenuItem>
										<MenuItem value="reward-redeemed">Reward Redeemed</MenuItem>
										<MenuItem value="order-received">Order Received</MenuItem>
										<MenuItem value="order-completed">Order Completed</MenuItem>
										<MenuItem value="delivery-completed">Delivery Completed</MenuItem>
										<MenuItem value="order-delayed">Order Delayed</MenuItem>
										<MenuItem value="payment-updated">Payment Updated</MenuItem>
										<MenuItem value="user-updated">User Updated</MenuItem>
										<MenuItem value="user-deleted">User Deleted</MenuItem>
										<MenuItem value="profile-updated">Profile Updated</MenuItem>
										<MenuItem value="support-ticket-created">Support Ticket</MenuItem>
										<MenuItem value="support-ticket-replied">Support Ticket Replied</MenuItem>
										<MenuItem value="service-created">Service Created</MenuItem>
										<MenuItem value="service-updated">Service Updated</MenuItem>
										<MenuItem value="service-deleted">Service Deleted</MenuItem>
									</Select>
								</FormControl>
								<FormControl size="small" sx={{ minWidth: 140 }}>
									<InputLabel>Timeframe</InputLabel>
									<Select
										value={timeframeFilter}
										label="Timeframe"
										onChange={(e) => setTimeframeFilter(e.target.value)}
										sx={{ bgcolor: "background.default" }}
									>
										<MenuItem value="all">All Time</MenuItem>
										<MenuItem value="today">Today</MenuItem>
										<MenuItem value="week">Last 7 Days</MenuItem>
										<MenuItem value="month">Last 30 Days</MenuItem>
									</Select>
								</FormControl>
							</Stack>
						</Stack>

						<TableContainer sx={{ overflowX: "auto" }}>
							<Table size="small" sx={{ minWidth: 700 }}>
								<TableHead>
									<TableRow sx={{ bgcolor: "background.default" }}>
										<TableCell 
											sx={{ fontWeight: 700, fontSize: 12, cursor: "pointer", userSelect: "none" }}
											onClick={() => setSortOrder(sortOrder === "desc" ? "asc" : "desc")}
										>
											<Stack direction="row" alignItems="center" spacing={0.5} sx={{ display: "inline-flex" }}>
												<span>Date & Time</span>
												{sortOrder === "desc" ? <ArrowDown size={14} /> : <ArrowUp size={14} />}
											</Stack>
										</TableCell>
										<TableCell 
											sx={{ fontWeight: 700, fontSize: 12, cursor: "pointer", userSelect: "none" }}
											onClick={() => setSortOrder(sortOrder === "desc" ? "asc" : "desc")}
										>
											<Stack direction="row" alignItems="center" spacing={0.5} sx={{ display: "inline-flex" }}>
												<span>Action Type</span>
												<ArrowUpDown size={13} style={{ opacity: 0.6 }} />
											</Stack>
										</TableCell>
										<TableCell 
											sx={{ fontWeight: 700, fontSize: 12, cursor: "pointer", userSelect: "none" }}
											onClick={() => setSortOrder(sortOrder === "desc" ? "asc" : "desc")}
										>
											<Stack direction="row" alignItems="center" spacing={0.5} sx={{ display: "inline-flex" }}>
												<span>Performed By</span>
												<ArrowUpDown size={13} style={{ opacity: 0.6 }} />
											</Stack>
										</TableCell>
										<TableCell sx={{ fontWeight: 700, fontSize: 12 }}>Target / Details</TableCell>
									</TableRow>
								</TableHead>
								<TableBody>
									{logs.length > 0 ? (
										logs.map((activity) => (
											<TableRow key={activity.id} hover>
												<TableCell sx={{ fontSize: 13, whiteSpace: "nowrap" }}>
													<Typography sx={{ fontWeight: 600, fontSize: 12 }}>
														{new Date(activity.createdAt).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}
													</Typography>
													<Typography variant="caption" color="text.secondary">
														{new Date(activity.createdAt).toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" })}
													</Typography>
												</TableCell>
												<TableCell>
													<Chip 
														icon={getActivityIcon(activity.type)} 
														label={getActivityLabel(activity.type)}
														size="small"
														color={getActivityColor(activity.type) as any}
														variant="outlined"
														sx={{ 
															fontWeight: 600, 
															py: 1.5,
															px: 0.5,
															borderRadius: "8px",
															height: "auto",
															bgcolor: (theme) => {
																const color = getActivityColor(activity.type) as "primary" | "secondary" | "success" | "error" | "info" | "warning";
																return alpha(theme.palette[color]?.main || theme.palette.grey[400], 0.08);
															}
														}}
													/>
												</TableCell>
												<TableCell sx={{ fontSize: 13, fontWeight: 500 }}>
													{activity.performedBy}
												</TableCell>
												<TableCell>
													<Typography sx={{ fontWeight: 600, fontSize: 13 }}>
														{activity.orderCode !== "N/A" ? `Order: ${activity.orderCode} (${activity.customerName})` : activity.customerName !== "N/A" ? activity.customerName : ""}
													</Typography>
													<Typography variant="caption" sx={{ color: "text.secondary", fontSize: 11, display: "block" }}>
														{(activity as any).details || ""}
														{activity.quantity > 0 ? ` [${activity.quantity} items]` : ""}
													</Typography>
												</TableCell>
											</TableRow>
										))
									) : (
										<TableRow>
											<TableCell colSpan={4} align="center" sx={{ py: 6 }}>
												<Typography color="text.secondary">No activities found matching your filters.</Typography>
											</TableCell>
										</TableRow>
									)}
								</TableBody>
							</Table>
						</TableContainer>

						{pagination && pagination.totalPages > 1 && (
							<Box sx={{ mt: 2, pt: 2, borderTop: 1, borderColor: "divider" }}>
								<PremiumPagination
									page={page}
									count={pagination.totalPages}
									onChange={(_, value) => setPage(value)}
									totalItems={pagination.total}
									rowsPerPage={pagination.limit}
									loading={loading}
								/>
							</Box>
						)}
					</Paper>
				</Box>

				<Footer />
			</Box>
		</Box>
	);
}
