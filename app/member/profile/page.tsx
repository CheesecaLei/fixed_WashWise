"use client";

import { useCallback, useEffect, useState } from "react";
import { CheckCircle2, CircleAlert, Eye, EyeOff, Lock, Mail, Phone, Shield, UserRound, Bell, BellRing } from "lucide-react";
import {
	alpha,
	Box,
	Button,
	Chip,
	CircularProgress,
	Collapse,
	Divider,
	Grid,
	IconButton,
	InputAdornment,
	Paper,
	Stack,
	TextField,
	Typography,
	Dialog,
	DialogTitle,
	DialogContent,
	DialogActions,
	Select,
	MenuItem,
	Alert,
} from "@mui/material";
import Sidebar from "../../components/sidebar";
import Footer from "../../components/footer";
import { useProfile, type ProfileData } from "../../hooks/use-profile";
import { usePushNotifications } from "../../hooks/use-push-notifications";
import { pusherClient } from "../../lib/pusher-client";
import { toast } from "react-toastify";

export default function ProfilePage() {
	const { isLoading, isSaving, isChangingPassword, error, fetchProfile, updateProfile, updatePassword } = useProfile();
	const [formValues, setFormValues] = useState<ProfileData>({
		username: "",
		contactNo: "",
		email: "",
	});
	const [saveSuccess, setSaveSuccess] = useState(false);
	const [saveError, setSaveError] = useState("");

	// Password change state
	const [showPasswordForm, setShowPasswordForm] = useState(false);
	const [passwordFields, setPasswordFields] = useState({
		currentPassword: "",
		newPassword: "",
		confirmPassword: "",
	});
	const [showCurrentPw, setShowCurrentPw] = useState(false);
	const [showNewPw, setShowNewPw] = useState(false);
	const [showConfirmPw, setShowConfirmPw] = useState(false);
	const [pwSuccess, setPwSuccess] = useState(false);
	const [pwError, setPwError] = useState("");

	// Push notifications state
	const { isSupported, isSubscribed, subscribe, unsubscribe, error: pushError } = usePushNotifications({ role: 'member' });
	const [isPushLoading, setIsPushLoading] = useState(false);

	// Admin Change Request State
	const [isRequestModalOpen, setIsRequestModalOpen] = useState(false);
	const [requestField, setRequestField] = useState<"username" | "contactNo" | "email">("username");
	const [requestValue, setRequestValue] = useState("");
	const [requestReason, setRequestReason] = useState("");
	const [requestSubmitting, setRequestSubmitting] = useState(false);
	const [requestStatusMsg, setRequestStatusMsg] = useState<{ type: "success" | "error"; text: string } | null>(null);

	const [myRequests, setMyRequests] = useState<Array<{
		id: string;
		field: "username" | "contactNo" | "email";
		currentValue: string;
		proposedValue: string;
		reason: string;
		status: "pending" | "approved" | "rejected";
		rejectionReason?: string;
		createdAt: string;
	}>>([]);

	const fetchMyRequests = useCallback(async () => {
		try {
			const res = await fetch("/api/member/profile-requests");
			const data = await res.json();
			if (res.ok && data.success) {
				setMyRequests(data.requests || []);
			}
		} catch (err) {
			console.error("Failed to load profile requests", err);
		}
	}, []);

	const handleSendAdminRequest = async () => {
		if (!requestValue.trim() || !requestReason.trim()) {
			setRequestStatusMsg({ type: "error", text: "Please enter your proposed new value and reason." });
			return;
		}
		setRequestSubmitting(true);
		setRequestStatusMsg(null);
		try {
			const res = await fetch("/api/member/profile-requests", {
				method: "POST",
				headers: { "Content-Type": "application/json" },
				body: JSON.stringify({
					field: requestField,
					proposedValue: requestValue.trim(),
					reason: requestReason.trim()
				})
			});
			const data = await res.json();
			if (res.ok && data.success) {
				setRequestStatusMsg({ type: "success", text: "Update request submitted to Admin! You will be notified once verified." });
				setRequestValue("");
				setRequestReason("");
				fetchMyRequests();
				setTimeout(() => {
					setIsRequestModalOpen(false);
					setRequestStatusMsg(null);
				}, 2500);
			} else {
				setRequestStatusMsg({ type: "error", text: data.error || "Failed to submit update request." });
			}
		} catch {
			setRequestStatusMsg({ type: "error", text: "Error submitting request. Please try again." });
		} finally {
			setRequestSubmitting(false);
		}
	};

	useEffect(() => {
		fetchProfile().then((result) => {
			if (result.success) {
				setFormValues(result.user);
			}
		});
		fetchMyRequests();
	}, [fetchProfile, fetchMyRequests]);

	useEffect(() => {
		if (typeof window === "undefined" || !pusherClient) return;

		const channel = pusherClient.subscribe("admin-profile-requests");

		channel.bind("profile-request-updated", (data: any) => {
			fetchMyRequests();
			fetchProfile().then((result) => {
				if (result.success) {
					setFormValues(result.user);
				}
			});
			if (data.status === "approved") {
				toast.success(`Your profile update for ${data.field} was approved!`);
			} else if (data.status === "rejected") {
				toast.error(`Your profile update for ${data.field} was rejected.`);
			}
		});

		return () => {
			pusherClient.unsubscribe("admin-profile-requests");
		};
	}, [fetchMyRequests, fetchProfile]);

	const handleFieldChange = (field: keyof ProfileData, value: string) => {
		setFormValues((prev) => ({ ...prev, [field]: value }));
		setSaveSuccess(false);
		setSaveError("");
	};

	const handleSave = async () => {
		setSaveSuccess(false);
		setSaveError("");
		const result = await updateProfile(formValues);
		if (!result.success) {
			setSaveError(result.error);
			return;
		}
		setSaveSuccess(true);
	};

	const handlePasswordChange = async () => {
		setPwSuccess(false);
		setPwError("");
		const result = await updatePassword(passwordFields);
		if (!result.success) {
			setPwError(result.error);
			return;
		}
		setPwSuccess(true);
		setPasswordFields({ currentPassword: "", newPassword: "", confirmPassword: "" });
		setShowPasswordForm(false);
	};

	const handleTogglePasswordForm = () => {
		setShowPasswordForm((prev) => !prev);
		setPwError("");
		setPwSuccess(false);
		setPasswordFields({ currentPassword: "", newPassword: "", confirmPassword: "" });
	};

	const handleTogglePush = async () => {
		setIsPushLoading(true);
		try {
			if (isSubscribed) {
				await unsubscribe();
			} else {
				await subscribe();
			}
		} catch (err) {
			console.error("Failed to toggle push notifications", err);
		} finally {
			setIsPushLoading(false);
		}
	};

	if (isLoading) {
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
					<Typography variant="h5" sx={{ fontWeight: 700, fontSize: { xs: 18, md: 22 }, mb: 0.3 }}>
						Account Overview
					</Typography>
					<Typography sx={{ color: "text.secondary", mb: 1.8, fontSize: 13 }}>
						Manage your personal details, security settings, and communication preferences.
					</Typography>

					{error && (
						<Typography color="error" sx={{ mb: 1.5, fontSize: 13 }}>
							{error}
						</Typography>
					)}

					<Stack spacing={1.5}>
						<Paper elevation={0} sx={{ border: 1, borderColor: "divider", borderRadius: 1.5, overflow: "hidden" }}>
							<Box sx={{ p: { xs: 1.2, md: 1.5 } }}>
								<Stack direction="row" spacing={1} alignItems="center" mb={1.5}>
									<Box
										sx={{
											width: 32,
											height: 32,
											display: "grid",
											placeItems: "center",
											borderRadius: 1,
											bgcolor: (theme) => alpha(theme.palette.info.main, 0.13),
											color: "info.main",
										}}
									>
										<UserRound size={16} />
									</Box>
									<Box>
										<Typography sx={{ fontWeight: 700, fontSize: 14 }}>Personal Information</Typography>
										<Typography variant="body2" color="text.secondary" sx={{ fontSize: 11 }}>
											Verified user credentials for laundry orders.
										</Typography>
									</Box>
								</Stack>

								<Box sx={{ bgcolor: "rgba(2, 132, 199, 0.05)", p: 1.2, borderRadius: 1.5, borderLeft: "4px solid #0284c7", mb: 2 }}>
									<Typography variant="caption" sx={{ display: "block", fontWeight: 700, color: "primary.main", mb: 0.2 }}>
										🔒 Verified Identity Controls:
									</Typography>
									<Typography variant="caption" color="text.secondary" sx={{ display: "block", fontSize: 11 }}>
										Username, Contact Number, and Email Address are locked for security and anti-fraud verification. To update any of these details, submit an update request for Admin review.
									</Typography>
								</Box>

								<Grid container spacing={1.5}>
									<Grid size={{ xs: 12, md: 6 }}>
										<Typography variant="caption" sx={{ color: "text.secondary", fontWeight: 700, fontSize: 11 }}>
											Username
										</Typography>
										<TextField
											fullWidth
											size="small"
											disabled
											value={formValues.username}
											sx={{ mt: 0.4 }}
											InputProps={{
												readOnly: true,
												startAdornment: (
													<InputAdornment position="start">
														<UserRound size={13} />
													</InputAdornment>
												),
											}}
										/>
									</Grid>
									<Grid size={{ xs: 12, md: 6 }}>
										<Typography variant="caption" sx={{ color: "text.secondary", fontWeight: 700, fontSize: 11 }}>
											Contact Number
										</Typography>
										<TextField
											fullWidth
											size="small"
											disabled
											value={formValues.contactNo}
											sx={{ mt: 0.4 }}
											InputProps={{
												readOnly: true,
												startAdornment: (
													<InputAdornment position="start">
														<Phone size={13} />
													</InputAdornment>
												),
											}}
										/>
									</Grid>

									<Grid size={12}>
										<Typography variant="caption" sx={{ color: "text.secondary", fontWeight: 700, fontSize: 11 }}>
											Email Address
										</Typography>
										<Stack direction={{ xs: "column", sm: "row" }} spacing={0.8} sx={{ mt: 0.4 }} alignItems={{ xs: "stretch", sm: "center" }}>
											<TextField
												fullWidth
												size="small"
												disabled
												value={formValues.email}
												InputProps={{
													readOnly: true,
													startAdornment: (
														<InputAdornment position="start">
															<Mail size={13} />
														</InputAdornment>
													),
												}}
											/>
											<Chip
												icon={<CheckCircle2 size={13} />}
												label="Verified"
												color="success"
												variant="outlined"
												sx={{ height: 32, px: 1, fontWeight: 700 }}
											/>
										</Stack>
									</Grid>
								</Grid>

								<Box sx={{ mt: 2, display: "flex", justifyContent: "flex-end" }}>
									<Button
										variant="outlined"
										color="primary"
										size="small"
										onClick={() => setIsRequestModalOpen(true)}
										sx={{ fontWeight: 700, borderRadius: 1.5 }}
									>
										Request Detail Update from Admin
									</Button>
								</Box>

								{myRequests.length > 0 && (
									<Box sx={{ mt: 2.5, pt: 2, borderTop: 1, borderColor: "divider" }}>
										<Typography variant="caption" sx={{ color: "text.secondary", fontWeight: 700, fontSize: 12, mb: 1, display: "block" }}>
											Recent Profile Update Requests
										</Typography>
										<Stack spacing={1}>
											{myRequests.slice(0, 3).map((req) => (
												<Paper key={req.id} variant="outlined" sx={{ p: 1.5, borderRadius: 1.5 }}>
													<Stack direction="row" alignItems="center" justifyContent="space-between" spacing={1}>
														<Box>
															<Typography sx={{ fontWeight: 700, fontSize: 13 }}>
																Update {req.field === "username" ? "Username / Full Name" : req.field === "contactNo" ? "Contact Number" : "Email Address"}
															</Typography>
															<Typography variant="body2" color="text.secondary" sx={{ fontSize: 12, mt: 0.2 }}>
																Proposed Value: <strong>{req.proposedValue}</strong> &bull; Reason: {req.reason}
															</Typography>
															{req.rejectionReason && (
																<Typography color="error" sx={{ fontSize: 11, mt: 0.5, fontWeight: 600 }}>
																	Admin Reason: {req.rejectionReason}
																</Typography>
															)}
														</Box>
														<Chip
															size="small"
															label={req.status === "pending" ? "Pending Review" : req.status === "approved" ? "Approved" : "Rejected"}
															color={req.status === "pending" ? "warning" : req.status === "approved" ? "success" : "error"}
															sx={{ fontWeight: 700, fontSize: 11 }}
														/>
													</Stack>
												</Paper>
											))}
										</Stack>
									</Box>
								)}
							</Box>
						</Paper>

						<Paper elevation={0} sx={{ border: 1, borderColor: "divider", borderRadius: 1.5, p: { xs: 1.2, md: 1.5 } }}>
							<Stack direction="row" spacing={1} alignItems="center" mb={1.5}>
								<Box
									sx={{
										width: 32,
										height: 32,
										display: "grid",
										placeItems: "center",
										borderRadius: 1,
										bgcolor: (theme) => alpha(theme.palette.info.main, 0.13),
										color: "info.main",
									}}
								>
									<Shield size={16} />
								</Box>
								<Box>
									<Typography sx={{ fontWeight: 700, fontSize: 14 }}>Account Security</Typography>
									<Typography variant="body2" color="text.secondary" sx={{ fontSize: 11 }}>
										Secure your account with a strong password.
									</Typography>
								</Box>
							</Stack>

							<Paper variant="outlined" sx={{ p: 1, borderRadius: 1, mb: 1 }}>
								<Stack direction="row" alignItems="center" justifyContent="space-between" spacing={1}>
									<Stack direction="row" spacing={1} alignItems="center">
										<Box
											sx={{
												width: 28,
												height: 28,
												display: "grid",
												placeItems: "center",
												borderRadius: "50%",
												bgcolor: (theme) => alpha(theme.palette.text.primary, 0.08),
												color: "text.secondary",
											}}
										>
											<Lock size={12} />
										</Box>
										<Box>
											<Typography sx={{ fontWeight: 700, fontSize: 12 }}>Password</Typography>
											<Typography variant="caption" color="text.secondary" sx={{ fontSize: 10 }}>
												Keep your account safe with a strong password.
											</Typography>
										</Box>
									</Stack>
									<Button
										variant={showPasswordForm ? "contained" : "outlined"}
										size="small"
										color={showPasswordForm ? "error" : "primary"}
										sx={{ py: 0.5, fontSize: 11 }}
										onClick={handleTogglePasswordForm}
									>
										{showPasswordForm ? "Cancel" : "Change Password"}
									</Button>
								</Stack>

								<Collapse in={showPasswordForm} unmountOnExit>
									<Box sx={{ mt: 1.5 }}>
										<Divider sx={{ mb: 1.5 }} />
										<Grid container spacing={1}>
											<Grid size={12}>
												<Typography variant="caption" sx={{ color: "text.secondary", fontWeight: 700, fontSize: 11 }}>
													Current Password
												</Typography>
												<TextField
													fullWidth
													size="small"
													type={showCurrentPw ? "text" : "password"}
													value={passwordFields.currentPassword}
													onChange={(e) => setPasswordFields((p) => ({ ...p, currentPassword: e.target.value }))}
													sx={{ mt: 0.4 }}
													InputProps={{
														startAdornment: (
															<InputAdornment position="start"><Lock size={13} /></InputAdornment>
														),
														endAdornment: (
															<InputAdornment position="end">
																<IconButton size="small" onClick={() => setShowCurrentPw((v) => !v)} edge="end">
																	{showCurrentPw ? <EyeOff size={14} /> : <Eye size={14} />}
																</IconButton>
															</InputAdornment>
														),
													}}
												/>
											</Grid>
											<Grid size={{ xs: 12, sm: 6 }}>
												<Typography variant="caption" sx={{ color: "text.secondary", fontWeight: 700, fontSize: 11 }}>
													New Password
												</Typography>
												<TextField
													fullWidth
													size="small"
													type={showNewPw ? "text" : "password"}
													value={passwordFields.newPassword}
													onChange={(e) => setPasswordFields((p) => ({ ...p, newPassword: e.target.value }))}
													sx={{ mt: 0.4 }}
													helperText="Minimum 8 characters"
													InputProps={{
														endAdornment: (
															<InputAdornment position="end">
																<IconButton size="small" onClick={() => setShowNewPw((v) => !v)} edge="end">
																	{showNewPw ? <EyeOff size={14} /> : <Eye size={14} />}
																</IconButton>
															</InputAdornment>
														),
													}}
												/>
											</Grid>
											<Grid size={{ xs: 12, sm: 6 }}>
												<Typography variant="caption" sx={{ color: "text.secondary", fontWeight: 700, fontSize: 11 }}>
													Confirm New Password
												</Typography>
												<TextField
													fullWidth
													size="small"
													type={showConfirmPw ? "text" : "password"}
													value={passwordFields.confirmPassword}
													onChange={(e) => setPasswordFields((p) => ({ ...p, confirmPassword: e.target.value }))}
													sx={{ mt: 0.4 }}
													InputProps={{
														endAdornment: (
															<InputAdornment position="end">
																<IconButton size="small" onClick={() => setShowConfirmPw((v) => !v)} edge="end">
																	{showConfirmPw ? <EyeOff size={14} /> : <Eye size={14} />}
																</IconButton>
															</InputAdornment>
														),
													}}
												/>
											</Grid>
										</Grid>

										<Stack direction="row" justifyContent="space-between" alignItems="center" mt={1.5}>
											<Box>
												{pwError && (
													<Typography color="error" sx={{ fontSize: 12 }}>{pwError}</Typography>
												)}
											</Box>
											<Button
												variant="contained"
												size="small"
												onClick={handlePasswordChange}
												disabled={isChangingPassword}
											>
												{isChangingPassword ? "Updating…" : "Update Password"}
											</Button>
										</Stack>
									</Box>
								</Collapse>
							</Paper>

							{pwSuccess && (
								<Paper variant="outlined" sx={{ p: 1, borderRadius: 1, mb: 1, borderColor: "success.main", bgcolor: (theme) => alpha(theme.palette.success.main, 0.07) }}>
									<Stack direction="row" spacing={0.6} alignItems="center">
										<CheckCircle2 size={12} color="green" />
										<Typography variant="caption" sx={{ color: "success.main", fontSize: 11, fontWeight: 600 }}>
											Password updated successfully.
										</Typography>
									</Stack>
								</Paper>
							)}

							<Paper
								variant="outlined"
								sx={{
									p: 1,
									borderRadius: 1,
									bgcolor: (theme) => alpha(theme.palette.warning.main, 0.08),
									borderColor: (theme) => alpha(theme.palette.warning.main, 0.25),
								}}
							>
								<Stack direction="row" spacing={0.6} alignItems="center">
									<CircleAlert size={12} />
									<Typography variant="caption" sx={{ color: "text.secondary", fontSize: 10 }}>
										Two-factor authentication is currently disabled. We recommend enabling it for better security.
									</Typography>
								</Stack>
							</Paper>
						</Paper>

						{/* Push Notifications Section */}
						<Paper elevation={0} sx={{ border: 1, borderColor: "divider", borderRadius: 1.5, p: { xs: 1.2, md: 1.5 } }}>
							<Stack direction="row" spacing={1} alignItems="center" mb={1.5}>
								<Box
									sx={{
										width: 32,
										height: 32,
										display: "grid",
										placeItems: "center",
										borderRadius: 1,
										bgcolor: (theme) => alpha(theme.palette.success.main, 0.13),
										color: "success.main",
									}}
								>
									{isSubscribed ? <BellRing size={16} /> : <Bell size={16} />}
								</Box>
								<Box>
									<Typography sx={{ fontWeight: 700, fontSize: 14 }}>Push Notifications</Typography>
									<Typography variant="body2" color="text.secondary" sx={{ fontSize: 11 }}>
										Receive background updates on your order status.
									</Typography>
								</Box>
							</Stack>

							<Paper variant="outlined" sx={{ p: 1, borderRadius: 1, mb: 1 }}>
								<Stack direction="row" alignItems="center" justifyContent="space-between" spacing={1}>
									<Stack direction="row" spacing={1} alignItems="center">
										<Box>
											<Typography sx={{ fontWeight: 700, fontSize: 12 }}>
												{isSubscribed ? "Notifications Enabled" : "Notifications Disabled"}
											</Typography>
											<Typography variant="caption" color="text.secondary" sx={{ fontSize: 10 }}>
												{isSupported
													? "We will send you alerts even when the app is closed."
													: "Your browser does not support Web Push."}
											</Typography>
										</Box>
									</Stack>
									<Button
										variant={isSubscribed ? "outlined" : "contained"}
										size="small"
										color={isSubscribed ? "error" : "success"}
										sx={{ py: 0.5, fontSize: 11 }}
										onClick={handleTogglePush}
										disabled={!isSupported || isPushLoading}
									>
										{isPushLoading ? "Updating…" : isSubscribed ? "Disable" : "Enable"}
									</Button>
								</Stack>
								{pushError && (
									<Typography color="error" sx={{ mt: 1, fontSize: 11 }}>
										{pushError.message}
									</Typography>
								)}
							</Paper>
						</Paper>
					</Stack>
				</Box>

				{/* Request Admin Change Modal */}
				<Dialog open={isRequestModalOpen} onClose={() => setIsRequestModalOpen(false)} maxWidth="xs" fullWidth>
					<DialogTitle sx={{ fontWeight: 800, pb: 1 }}>
						Request Profile Detail Update
					</DialogTitle>
					<DialogContent>
						<Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
							Verified account credentials require admin authorization to update. Select the detail you wish to change and provide a valid reason.
						</Typography>

						{requestStatusMsg && (
							<Alert severity={requestStatusMsg.type} sx={{ mb: 2, fontSize: 12 }}>
								{requestStatusMsg.text}
							</Alert>
						)}

						<Stack spacing={2}>
							<Box>
								<Typography variant="caption" sx={{ fontWeight: 700, color: "text.secondary", display: "block", mb: 0.5 }}>
									Field to Update
								</Typography>
								<Select
									fullWidth
									size="small"
									value={requestField}
									onChange={(e) => setRequestField(e.target.value as any)}
								>
									<MenuItem value="username">Username / Full Name</MenuItem>
									<MenuItem value="contactNo">Contact Number</MenuItem>
									<MenuItem value="email">Email Address</MenuItem>
								</Select>
							</Box>

							<TextField
								fullWidth
								size="small"
								label="Proposed New Value"
								value={requestValue}
								onChange={(e) => setRequestValue(e.target.value)}
								placeholder="Enter your new name, contact, or email"
							/>

							<TextField
								fullWidth
								size="small"
								multiline
								minRows={3}
								label="Reason for Change"
								value={requestReason}
								onChange={(e) => setRequestReason(e.target.value)}
								placeholder="e.g. Changed mobile number, corrected spelling..."
							/>
						</Stack>
					</DialogContent>
					<DialogActions sx={{ p: 2, pt: 0 }}>
						<Button onClick={() => setIsRequestModalOpen(false)} variant="outlined" size="small">
							Cancel
						</Button>
						<Button onClick={handleSendAdminRequest} variant="contained" color="primary" size="small" disabled={requestSubmitting} sx={{ fontWeight: 700 }}>
							{requestSubmitting ? "Submitting..." : "Submit Request"}
						</Button>
					</DialogActions>
				</Dialog>

				<Footer />
			</Box>
		</Box>
	);
}
