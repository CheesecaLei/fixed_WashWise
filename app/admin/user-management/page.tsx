"use client";

import { useState, useMemo } from "react";
import { MoreVertical, Mail, Phone, RefreshCcw, Trash2, UserCheck, UserX, FilterX } from "lucide-react";
import {
	alpha,
	Avatar,
	Box,
	Chip,
	Grid,
	IconButton,
	Paper,
	Stack,
	Table,
	TableBody,
	TableCell,
	TableHead,
	TableRow,
	Typography,
	CircularProgress,
	Alert,
	Menu,
	MenuItem,
	ListItemIcon,
	ListItemText,
	TextField,
	InputAdornment,
	Dialog,
	DialogTitle,
	DialogContent,
	DialogActions,
	Button,
	Tabs,
	Tab,
	Badge,
} from "@mui/material";
import { toast } from "react-toastify";
import { Search, Check, X, Clock, FileText } from "lucide-react";
import Sidebar from "../../components/sidebar";
import Footer from "../../components/footer";
import PremiumPagination from "../../components/pagination";
import { useUserManagement } from "../../hooks/use-user-management";
import { useProfileRequests, type ProfileRequestItem } from "../../hooks/use-profile-requests";
import type { UserStatus } from "../../types/dashboard";

function getStatusColor(status: UserStatus) {
	const colors: Record<UserStatus, "success" | "warning" | "error"> = {
		active: "success",
		inactive: "warning",
		suspended: "error",
	};
	return colors[status] || "default";
}

function getStatusLabel(status: UserStatus) {
	const labels: Record<UserStatus, string> = {
		active: "Active",
		inactive: "Inactive",
		suspended: "Suspended",
	};
	return labels[status] || status;
}

export default function UserManagementPage() {
	const { users, stats, loading, isInitialLoading, error, search, setSearch, page, setPage, pagination, refresh, updateUserStatus, updateUser, deleteUser } = useUserManagement();
	const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null);
	const [selectedUserId, setSelectedUserId] = useState<string | null>(null);
	const [editDialogOpen, setEditDialogOpen] = useState(false);
	const [editData, setEditData] = useState({ name: "", email: "", contactNo: "" });
	const [userFilter, setUserFilter] = useState<string>("all");

	// Profile Requests State & Hook
	const [mainTab, setMainTab] = useState<"users" | "requests">("users");
	const {
		requests,
		pendingCount,
		loading: requestsLoading,
		statusFilter: reqStatusFilter,
		setStatusFilter: setReqStatusFilter,
		search: reqSearch,
		setSearch: setReqSearch,
		page: reqPage,
		setPage: setReqPage,
		pagination: reqPagination,
		refresh: refreshRequests,
		approveRequest,
		rejectRequest,
	} = useProfileRequests();

	// Rejection modal state
	const [rejectModalOpen, setRejectModalOpen] = useState(false);
	const [selectedReqId, setSelectedReqId] = useState<string | null>(null);
	const [rejectionReasonInput, setRejectionReasonInput] = useState("");
	const [isProcessingReq, setIsProcessingReq] = useState(false);

	// Approval modal state
	const [approveModalOpen, setApproveModalOpen] = useState(false);
	const [selectedApproveReq, setSelectedApproveReq] = useState<ProfileRequestItem | null>(null);

	const handleOpenApproveModal = (req: ProfileRequestItem) => {
		setSelectedApproveReq(req);
		setApproveModalOpen(true);
	};

	const handleConfirmApprove = async () => {
		if (!selectedApproveReq) return;
		setIsProcessingReq(true);
		const result = await approveRequest(selectedApproveReq.id);
		setIsProcessingReq(false);
		if (result.ok) {
			toast.success(result.message || "Profile update request approved.");
			setApproveModalOpen(false);
			setSelectedApproveReq(null);
			refresh();
		} else {
			toast.error(result.error || "Failed to approve request.");
		}
	};

	const handleOpenRejectModal = (requestId: string) => {
		setSelectedReqId(requestId);
		setRejectionReasonInput("");
		setRejectModalOpen(true);
	};

	const handleConfirmReject = async () => {
		if (!selectedReqId) return;
		setIsProcessingReq(true);
		const result = await rejectRequest(selectedReqId, rejectionReasonInput);
		setIsProcessingReq(false);
		if (result.ok) {
			toast.success(result.message || "Profile request rejected.");
			setRejectModalOpen(false);
			setSelectedReqId(null);
		} else {
			toast.error(result.error || "Failed to reject request.");
		}
	};

	const filteredUsers = useMemo(() => {
		if (userFilter === "all" || userFilter === "total") return users;
		return users.filter(u => u.status === userFilter);
	}, [users, userFilter]);

	const handleMenuOpen = (event: React.MouseEvent<HTMLButtonElement>, userId: string) => {
		setAnchorEl(event.currentTarget);
		setSelectedUserId(userId);
	};

	const handleMenuClose = () => {
		setAnchorEl(null);
		setSelectedUserId(null);
	};

	const handleAction = async (action: 'active' | 'suspended' | 'delete' | 'verify' | 'edit') => {
		if (!selectedUserId) return;

		if (action === 'edit') {
			const userToEdit = users.find(u => u.id === selectedUserId);
			if (userToEdit) {
				setEditData({ name: userToEdit.name, email: userToEdit.email, contactNo: userToEdit.phone });
				setEditDialogOpen(true);
			}
			handleMenuClose();
			return;
		}

		let result;
		if (action === 'delete') {
			if (confirm("Are you sure you want to delete this user?")) {
				result = await deleteUser(selectedUserId);
			}
		} else if (action === 'verify') {
			result = await updateUserStatus(selectedUserId, true, true);
		} else {
			result = await updateUserStatus(selectedUserId, action);
		}
		
		if (result) {
			if (result.ok) {
				toast.success(`User successfully ${action === 'delete' ? 'deleted' : 'updated'}.`);
			} else {
				toast.error(result.error || "Action failed.");
			}
		}
		
		handleMenuClose();
	};

	const handleSaveEdit = async () => {
		if (!selectedUserId) return;
		const result = await updateUser(selectedUserId, editData);
		if (result.ok) {
			toast.success("User updated successfully.");
			setEditDialogOpen(false);
		} else {
			toast.error(result.error || "Update failed.");
		}
	};

	if (isInitialLoading) {
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
				<Box sx={{ px: { xs: 1.5, sm: 2, md: 3 }, py: { xs: 1.25, md: 2 }, flex: 1 }}>
					<Stack direction="row" justifyContent="space-between" alignItems="flex-start" mb={2}>
						<Box>
							<Typography variant="h5" sx={{ fontWeight: 700, fontSize: { xs: 20, md: 24 }, mb: 0.3 }}>
								User Management
							</Typography>
							<Typography color="text.secondary" sx={{ fontSize: 12 }}>
								Manage and monitor user accounts and activities.
							</Typography>
						</Box>
						<Stack direction="row" spacing={1.5} alignItems="center" component="form" onSubmit={(e) => e.preventDefault()}>
							<TextField
								size="small"
								placeholder="Search users..."
								value={search}
								onChange={(e) => setSearch(e.target.value)}
								onKeyDown={(e) => {
									if (e.key === "Enter") {
										e.preventDefault();
									}
								}}
								sx={{ width: 220, "& .MuiOutlinedInput-root": { borderRadius: 2 } }}
								InputProps={{
									startAdornment: (
										<InputAdornment position="start">
											<Search size={16} />
										</InputAdornment>
									),
									endAdornment: loading ? (
										<InputAdornment position="end">
											<CircularProgress size={14} />
										</InputAdornment>
									) : null,
								}}
							/>
							<IconButton onClick={refresh} disabled={loading} size="small">
								<RefreshCcw size={18} className={loading ? "animate-spin" : ""} />
							</IconButton>
						</Stack>
					</Stack>

					{error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}

					<Grid container spacing={{ xs: 1.5, sm: 2 }} mb={2.5} columns={{ xs: 2, sm: 2, md: 4 }}>
						{stats.map((stat) => {
							const isSelected = userFilter === stat.id;

							return (
								<Grid key={stat.id} size={{ xs: 1, sm: 1, md: 1 }}>
									<Paper
										elevation={0}
										onClick={() => setUserFilter(prev => prev === stat.id ? "all" : stat.id)}
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
											},
											"&:active": {
												transform: "translateY(-1px)",
											},
										}}
									>
										<Typography
											sx={{
												fontSize: { xs: 26, sm: 28, md: 30 },
												fontWeight: 800,
												lineHeight: 1.1,
												letterSpacing: "-0.02em",
												color: `${stat.color}.main`,
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

					<Paper elevation={0} sx={{ border: 1, borderColor: "divider", borderRadius: 1.5, overflow: "hidden" }}>
						<Box sx={{ borderBottom: 1, borderColor: "divider", bgcolor: "background.paper", px: 2 }}>
							<Tabs
								value={mainTab}
								onChange={(_, val) => setMainTab(val)}
								textColor="primary"
								indicatorColor="primary"
							>
								<Tab label="User Accounts" value="users" sx={{ fontWeight: 700, textTransform: "none", fontSize: 13 }} />
								<Tab
									value="requests"
									label={
										<Stack direction="row" spacing={1} alignItems="center">
											<span>Profile Update Requests</span>
											{pendingCount > 0 && (
												<Chip
													label={pendingCount}
													color="warning"
													size="small"
													sx={{ height: 18, fontSize: 10, fontWeight: 800, px: 0.5 }}
												/>
											)}
										</Stack>
									}
									sx={{ fontWeight: 700, textTransform: "none", fontSize: 13 }}
								/>
							</Tabs>
						</Box>

						{mainTab === "users" ? (
							<>
								<Box sx={{ p: 1.5, borderBottom: 1, borderColor: "divider", bgcolor: "background.paper", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
									<Typography variant="h6" sx={{ fontWeight: 700, fontSize: 15 }}>
										User Accounts
									</Typography>
									{userFilter !== "all" && userFilter !== "total" && (
										<Chip
											icon={<FilterX size={14} />}
											label={`Filter: ${userFilter.toUpperCase()} (Clear)`}
											color="primary"
											size="small"
											variant="outlined"
											onClick={() => setUserFilter("all")}
											sx={{ cursor: "pointer", fontWeight: 700 }}
										/>
									)}
								</Box>

								<Box sx={{ overflowX: "auto" }}>
									<Table size="small" sx={{ minWidth: { xs: 640, md: 800 } }}>
										<TableHead>
											<TableRow sx={{ bgcolor: "background.default" }}>
												<TableCell sx={{ fontWeight: 700, fontSize: 11 }}>User</TableCell>
												<TableCell sx={{ fontWeight: 700, fontSize: 11 }}>Email</TableCell>
												<TableCell sx={{ fontWeight: 700, fontSize: 11 }}>Phone</TableCell>
												<TableCell align="center" sx={{ fontWeight: 700, fontSize: 11 }}>
													Orders
												</TableCell>
												<TableCell align="right" sx={{ fontWeight: 700, fontSize: 11 }}>
													Total Spent
												</TableCell>
												<TableCell align="center" sx={{ fontWeight: 700, fontSize: 11 }}>
													Status
												</TableCell>
												<TableCell align="center" sx={{ fontWeight: 700, fontSize: 11 }}>
													Action
												</TableCell>
											</TableRow>
										</TableHead>
										<TableBody>
											{filteredUsers.length > 0 ? (
												filteredUsers.map((user) => (
													<TableRow key={user.id} sx={{ "&:hover": { bgcolor: "background.default" } }}>
														<TableCell sx={{ fontSize: 12 }}>
															<Stack direction="row" spacing={1} alignItems="center">
																<Avatar sx={{ width: 28, height: 28, fontSize: 10, bgcolor: 'primary.light' }}>
																	{user.name.charAt(0).toUpperCase()}
																</Avatar>
																<Box>
																	<Typography sx={{ fontWeight: 700, fontSize: 12 }}>{user.name}</Typography>
																	<Typography variant="caption" sx={{ color: "text.secondary", fontSize: 10 }}>
																		Joined {user.joinDate}
																	</Typography>
																</Box>
															</Stack>
														</TableCell>
														<TableCell sx={{ fontSize: 11 }}>
															<Stack direction="row" spacing={0.5} alignItems="center">
																<Mail size={13} className="text-gray-400" />
																<Typography sx={{ fontSize: 11 }}>{user.email}</Typography>
															</Stack>
														</TableCell>
														<TableCell sx={{ fontSize: 11 }}>
															<Stack direction="row" spacing={0.5} alignItems="center">
																<Phone size={13} className="text-gray-400" />
																<Typography sx={{ fontSize: 11 }}>{user.phone}</Typography>
															</Stack>
														</TableCell>
														<TableCell align="center" sx={{ fontWeight: 700, fontSize: 12 }}>
															{user.orders}
														</TableCell>
														<TableCell align="right" sx={{ fontWeight: 700, fontSize: 12, color: "success.main" }}>
															{user.totalSpent}
														</TableCell>
														<TableCell align="center">
															<Chip
																label={getStatusLabel(user.status)}
																color={getStatusColor(user.status)}
																size="small"
																sx={{ height: 22, fontSize: 10, minWidth: 70 }}
															/>
														</TableCell>
														<TableCell align="center">
															<IconButton 
																size="small" 
																sx={{ color: "text.secondary" }}
																onClick={(e) => handleMenuOpen(e, user.id)}
															>
																<MoreVertical size={14} />
															</IconButton>
														</TableCell>
													</TableRow>
												))
											) : (
												<TableRow>
													<TableCell colSpan={7} align="center" sx={{ py: 4 }}>
														<Typography variant="body2" color="text.secondary">No users found.</Typography>
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
											loading={loading}
										/>
									</Box>
								)}
							</>
						) : (
							<>
								<Box sx={{ p: 1.5, borderBottom: 1, borderColor: "divider", bgcolor: "background.paper", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
									<Typography variant="h6" sx={{ fontWeight: 700, fontSize: 15 }}>
										Profile Detail Change Requests
									</Typography>
									<Stack direction="row" spacing={1}>
										{["all", "pending", "approved", "rejected"].map((st) => (
											<Chip
												key={st}
												label={st.charAt(0).toUpperCase() + st.slice(1)}
												color={reqStatusFilter === st ? "primary" : "default"}
												variant={reqStatusFilter === st ? "filled" : "outlined"}
												size="small"
												onClick={() => setReqStatusFilter(st)}
												sx={{ cursor: "pointer", fontWeight: 700, fontSize: 11 }}
											/>
										))}
									</Stack>
								</Box>

								<Box sx={{ overflowX: "auto" }}>
									<Table size="small" sx={{ minWidth: { xs: 700, md: 900 } }}>
										<TableHead>
											<TableRow sx={{ bgcolor: "background.default" }}>
												<TableCell sx={{ fontWeight: 700, fontSize: 11 }}>Member</TableCell>
												<TableCell sx={{ fontWeight: 700, fontSize: 11 }}>Field to Update</TableCell>
												<TableCell sx={{ fontWeight: 700, fontSize: 11 }}>Current Value</TableCell>
												<TableCell sx={{ fontWeight: 700, fontSize: 11 }}>Proposed Value</TableCell>
												<TableCell sx={{ fontWeight: 700, fontSize: 11 }}>Reason</TableCell>
												<TableCell sx={{ fontWeight: 700, fontSize: 11 }}>Requested Date</TableCell>
												<TableCell align="center" sx={{ fontWeight: 700, fontSize: 11 }}>Status</TableCell>
												<TableCell align="center" sx={{ fontWeight: 700, fontSize: 11 }}>Action</TableCell>
											</TableRow>
										</TableHead>
										<TableBody>
											{requestsLoading ? (
												<TableRow>
													<TableCell colSpan={8} align="center" sx={{ py: 4 }}>
														<CircularProgress size={24} />
													</TableCell>
												</TableRow>
											) : requests.length > 0 ? (
												requests.map((req) => (
													<TableRow key={req.id} sx={{ "&:hover": { bgcolor: "background.default" } }}>
														<TableCell sx={{ fontSize: 12 }}>
															<Box>
																<Typography sx={{ fontWeight: 700, fontSize: 12 }}>{req.userName}</Typography>
																<Typography variant="caption" sx={{ color: "text.secondary", fontSize: 10 }}>
																	{req.userEmail}
																</Typography>
															</Box>
														</TableCell>
														<TableCell sx={{ fontSize: 11 }}>
															<Chip
																label={req.field === "username" ? "Username" : req.field === "contactNo" ? "Contact No" : "Email"}
																size="small"
																variant="outlined"
																color="info"
																sx={{ height: 22, fontSize: 10, fontWeight: 700 }}
															/>
														</TableCell>
														<TableCell sx={{ fontSize: 11, color: "text.secondary" }}>
															{req.currentValue || "N/A"}
														</TableCell>
														<TableCell sx={{ fontSize: 11, fontWeight: 700, color: "primary.main" }}>
															{req.proposedValue}
														</TableCell>
														<TableCell sx={{ fontSize: 11, maxWidth: 200 }}>
															<Typography variant="caption" sx={{ fontSize: 11, display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical", overflow: "hidden" }}>
																{req.reason}
															</Typography>
														</TableCell>
														<TableCell sx={{ fontSize: 10, color: "text.secondary" }}>
															{new Date(req.createdAt).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}
														</TableCell>
														<TableCell align="center">
															<Chip
																label={req.status === "pending" ? "Pending" : req.status === "approved" ? "Approved" : "Rejected"}
																color={req.status === "pending" ? "warning" : req.status === "approved" ? "success" : "error"}
																size="small"
																sx={{ height: 22, fontSize: 10, minWidth: 65, fontWeight: 700 }}
															/>
														</TableCell>
														<TableCell align="center">
															{req.status === "pending" ? (
																<Stack direction="row" spacing={0.5} justifyContent="center">
																	<Button
																		variant="contained"
																		color="success"
																		size="small"
																		disabled={isProcessingReq}
																		onClick={() => handleOpenApproveModal(req)}
																		sx={{ minWidth: 0, px: 1, py: 0.25, fontSize: 10, fontWeight: 700 }}
																	>
																		Approve
																	</Button>
																	<Button
																		variant="outlined"
																		color="error"
																		size="small"
																		disabled={isProcessingReq}
																		onClick={() => handleOpenRejectModal(req.id)}
																		sx={{ minWidth: 0, px: 1, py: 0.25, fontSize: 10, fontWeight: 700 }}
																	>
																		Reject
																	</Button>
																</Stack>
															) : (
																<Typography variant="caption" color="text.secondary" sx={{ fontSize: 10 }}>
																	Resolved
																</Typography>
															)}
														</TableCell>
													</TableRow>
												))
											) : (
												<TableRow>
													<TableCell colSpan={8} align="center" sx={{ py: 4 }}>
														<Typography variant="body2" color="text.secondary">
															No profile update requests found.
														</Typography>
													</TableCell>
												</TableRow>
											)}
										</TableBody>
									</Table>
								</Box>

								{reqPagination && reqPagination.totalPages > 1 && (
									<Box sx={{ p: 1 }}>
										<PremiumPagination
											page={reqPage}
											count={reqPagination.totalPages}
											onChange={(_, value) => setReqPage(value)}
											totalItems={reqPagination.total}
											rowsPerPage={reqPagination.limit}
											loading={requestsLoading}
										/>
									</Box>
								)}
							</>
						)}
					</Paper>

				{/* Approve Confirmation Modal */}
				<Dialog open={approveModalOpen} onClose={() => setApproveModalOpen(false)} maxWidth="xs" fullWidth PaperProps={{ sx: { borderRadius: 3 } }}>
					<DialogTitle sx={{ fontWeight: 800, pb: 1 }}>Confirm Profile Update Approval</DialogTitle>
					<DialogContent>
						<Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
							Are you sure you want to approve this profile update request? This action will immediately update the user&apos;s verified credentials in the system.
						</Typography>

						{selectedApproveReq && (
							<Paper variant="outlined" sx={{ p: 1.5, borderRadius: 2, bgcolor: (theme) => alpha(theme.palette.primary.main, 0.04), mb: 1 }}>
								<Stack spacing={1}>
									<Box>
										<Typography variant="caption" color="text.secondary" sx={{ fontWeight: 700 }}>Member</Typography>
										<Typography sx={{ fontWeight: 700, fontSize: 13 }}>{selectedApproveReq.userName} ({selectedApproveReq.userEmail})</Typography>
									</Box>
									<Box>
										<Typography variant="caption" color="text.secondary" sx={{ fontWeight: 700 }}>Field to Update</Typography>
										<Typography sx={{ fontWeight: 700, fontSize: 13, textTransform: "capitalize" }}>{selectedApproveReq.field}</Typography>
									</Box>
									<Box>
										<Typography variant="caption" color="text.secondary" sx={{ fontWeight: 700 }}>Proposed Value</Typography>
										<Stack direction="row" spacing={1} alignItems="center">
											<Typography sx={{ fontSize: 12, color: "text.secondary", textDecoration: "line-through" }}>
												{selectedApproveReq.currentValue || "(Empty)"}
											</Typography>
											<span>→</span>
											<Typography sx={{ fontWeight: 800, fontSize: 13, color: "success.main" }}>
												{selectedApproveReq.proposedValue}
											</Typography>
										</Stack>
									</Box>
									{selectedApproveReq.reason && (
										<Box>
											<Typography variant="caption" color="text.secondary" sx={{ fontWeight: 700 }}>Reason Provided</Typography>
											<Typography variant="body2" sx={{ fontSize: 12 }}>{selectedApproveReq.reason}</Typography>
										</Box>
									)}
								</Stack>
							</Paper>
						)}
					</DialogContent>
					<DialogActions sx={{ px: 3, pb: 2 }}>
						<Button onClick={() => setApproveModalOpen(false)} color="inherit" disabled={isProcessingReq}>Cancel</Button>
						<Button onClick={handleConfirmApprove} variant="contained" color="success" disabled={isProcessingReq} sx={{ borderRadius: 2, fontWeight: 700 }}>
							{isProcessingReq ? "Updating..." : "Approve & Update User"}
						</Button>
					</DialogActions>
				</Dialog>

				<Dialog open={rejectModalOpen} onClose={() => setRejectModalOpen(false)} maxWidth="xs" fullWidth PaperProps={{ sx: { borderRadius: 3 } }}>
					<DialogTitle sx={{ fontWeight: 800 }}>Reject Update Request</DialogTitle>
					<DialogContent>
						<Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
							Specify an optional reason for rejecting this profile detail update request. The member will be able to see this reason.
						</Typography>
						<TextField
							fullWidth
							multiline
							minRows={3}
							label="Rejection Reason"
							placeholder="e.g. Invalid document, unable to verify identity..."
							value={rejectionReasonInput}
							onChange={(e) => setRejectionReasonInput(e.target.value)}
							size="small"
						/>
					</DialogContent>
					<DialogActions sx={{ px: 3, pb: 2 }}>
						<Button onClick={() => setRejectModalOpen(false)} color="inherit" disabled={isProcessingReq}>Cancel</Button>
						<Button onClick={handleConfirmReject} variant="contained" color="error" disabled={isProcessingReq} sx={{ borderRadius: 2, fontWeight: 700 }}>
							{isProcessingReq ? "Rejecting..." : "Confirm Rejection"}
						</Button>
					</DialogActions>
				</Dialog>
				</Box>

				<Menu
					anchorEl={anchorEl}
					open={Boolean(anchorEl)}
					onClose={handleMenuClose}
					PaperProps={{
						elevation: 3,
						sx: { minWidth: 160, borderRadius: 1.5 }
					}}
				>
					<MenuItem onClick={() => handleAction('verify')}>
						<ListItemIcon><UserCheck size={16} className="text-blue-600" /></ListItemIcon>
						<ListItemText primary="Verify User" primaryTypographyProps={{ fontSize: 13 }} />
					</MenuItem>
					<MenuItem onClick={() => handleAction('edit')}>
						<ListItemIcon><UserCheck size={16} className="text-gray-600" /></ListItemIcon>
						<ListItemText primary="Edit User" primaryTypographyProps={{ fontSize: 13 }} />
					</MenuItem>
					<MenuItem onClick={() => handleAction('active')}>
						<ListItemIcon><UserCheck size={16} className="text-green-600" /></ListItemIcon>
						<ListItemText primary="Activate User" primaryTypographyProps={{ fontSize: 13 }} />
					</MenuItem>
					<MenuItem onClick={() => handleAction('suspended')}>
						<ListItemIcon><UserX size={16} className="text-orange-600" /></ListItemIcon>
						<ListItemText primary="Suspend User" primaryTypographyProps={{ fontSize: 13 }} />
					</MenuItem>
					<MenuItem onClick={() => handleAction('delete')} sx={{ color: 'error.main' }}>
						<ListItemIcon><Trash2 size={16} className="text-red-600" /></ListItemIcon>
						<ListItemText primary="Delete Account" primaryTypographyProps={{ fontSize: 13 }} />
					</MenuItem>
				</Menu>

				<Dialog open={editDialogOpen} onClose={() => setEditDialogOpen(false)} maxWidth="sm" fullWidth PaperProps={{ sx: { borderRadius: 3 } }}>
					<DialogTitle sx={{ fontWeight: 800 }}>Edit User Details</DialogTitle>
					<DialogContent>
						<Stack spacing={2} sx={{ mt: 1 }}>
							<TextField
								fullWidth
								label="Name"
								value={editData.name}
								onChange={(e) => setEditData({ ...editData, name: e.target.value })}
								size="small"
							/>
							<TextField
								fullWidth
								label="Email"
								value={editData.email}
								onChange={(e) => setEditData({ ...editData, email: e.target.value })}
								size="small"
							/>
							<TextField
								fullWidth
								label="Contact Number"
								value={editData.contactNo}
								onChange={(e) => setEditData({ ...editData, contactNo: e.target.value })}
								size="small"
							/>
						</Stack>
					</DialogContent>
					<DialogActions sx={{ px: 3, pb: 2 }}>
						<Button onClick={() => setEditDialogOpen(false)} color="inherit">Cancel</Button>
						<Button onClick={handleSaveEdit} variant="contained" sx={{ borderRadius: 2 }}>Save Changes</Button>
					</DialogActions>
				</Dialog>

				<Footer />
			</Box>
		</Box>
	);
}
