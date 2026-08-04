"use client";

import { useCallback, useEffect, useState } from "react";
import {
	BadgePlus,
	CheckCircle2,
	CirclePlus,
	House,
	Info,
	MapPin,
	PackageCheck,
	Trash2,
	Zap,
	Building2,
} from "lucide-react";
import Link from "next/link";
import {
	alpha,
	Box,
	Button,
	Chip,
	CircularProgress,
	Dialog,
	DialogActions,
	DialogContent,
	DialogTitle,
	Divider,
	Grid,
	InputAdornment,
	MenuItem,
	Paper,
	Stack,
	TextField,
	Typography,
} from "@mui/material";
import Sidebar from "../../components/sidebar";
import Footer from "../../components/footer";
import { useAddresses, type SavedAddress } from "../../hooks/use-addresses";
import { logisticsTipsMockData } from "../../data/addresses";
import {
	buildSignupFormattedAddress,
	olongapoBarangays,
	olongapoStreets,
	signupFormLabels,
	signupReadonlyAddress,
} from "../../data/auth";

export default function AddressesPage() {
	const { isLoading, isSubmitting, fetchAddresses, addAddress, setActive, deleteAddress } =
		useAddresses();

	const [addresses, setAddresses] = useState<SavedAddress[]>([]);
	const [pageError, setPageError] = useState("");

	// Add-address dialog state
	const [dialogOpen, setDialogOpen] = useState(false);
	const [newLabel, setNewLabel] = useState("");
	const [newHouseOrUnit, setNewHouseOrUnit] = useState("");
	const [newStreet, setNewStreet] = useState("");
	const [newBarangay, setNewBarangay] = useState("");
	const [newLandmark, setNewLandmark] = useState("");
	const [newNote, setNewNote] = useState("");
	const [addError, setAddError] = useState("");

	const loadAddresses = useCallback(async () => {
		const result = await fetchAddresses();
		if (!result.success) {
			setPageError(result.error);
			return;
		}
		setAddresses(result.addresses);
	}, [fetchAddresses]);

	useEffect(() => {
		let isMounted = true;
		const init = async () => {
			if (isMounted) {
				await loadAddresses();
			}
		};
		init();
		return () => {
			isMounted = false;
		};
	}, [loadAddresses]);

	const activeAddress = addresses.find((a) => a.isActive);
	const defaultAddress = addresses.find((a) => a.isDefault);


	const handleSetActive = async (addressId: string) => {
		// Optimistic toggle
		setAddresses((prev) => {
			const current = prev.find((a) => a.id === addressId);
			const wasActive = current?.isActive ?? false;
			return prev.map((a) => ({
				...a,
				isActive: wasActive ? false : a.id === addressId,
			}));
		});
		const result = await setActive(addressId);
		if (!result.success) {
			// Revert on failure
			await loadAddresses();
			setPageError(result.error);
		}
	};

	const handleDelete = async (addressId: string) => {
		const result = await deleteAddress(addressId);
		if (!result.success) {
			setPageError(result.error);
			return;
		}
		setAddresses((prev) => prev.filter((a) => a.id !== addressId));
	};

	const handleAddSubmit = async () => {
		setAddError("");
		if (!newLabel.trim() || !newHouseOrUnit.trim() || !newStreet.trim() || !newBarangay.trim()) {
			setAddError("Label and primary address fields are required.");
			return;
		}

		const fullAddress = buildSignupFormattedAddress({
			houseOrUnit: newHouseOrUnit,
			street: newStreet,
			barangay: newBarangay,
		});

		const finalNote = newLandmark.trim()
			? `Landmark: ${newLandmark}${newNote ? ` | Note: ${newNote}` : ""}`
			: newNote;

		const result = await addAddress({ label: newLabel, fullAddress, note: finalNote });
		if (!result.success) {
			setAddError(result.error);
			return;
		}

		setAddresses((prev) => [...prev, result.address]);
		setDialogOpen(false);
		setNewLabel("");
		setNewHouseOrUnit("");
		setNewStreet("");
		setNewBarangay("");
		setNewLandmark("");
		setNewNote("");
	};

	const handleDialogClose = () => {
		setDialogOpen(false);
		setNewLabel("");
		setNewHouseOrUnit("");
		setNewStreet("");
		setNewBarangay("");
		setNewLandmark("");
		setNewNote("");
		setAddError("");
	};

	const summaryCards = [
		{
			id: "default-location",
			title: "Default Location",
			value: defaultAddress?.label ?? "—",
			highlight: true,
			icon: <House size={13} />,
		},
		{
			id: "active-address",
			title: "Active Address",
			value: activeAddress?.label ?? "None",
			highlight: false,
			icon: <Zap size={13} />,
		},
		{
			id: "total-saved",
			title: "Saved Addresses",
			value: `${addresses.length} Location${addresses.length !== 1 ? "s" : ""}`,
			highlight: false,
			icon: <PackageCheck size={13} />,
		},
	];

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
		<>
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
						{/* Header */}
						<Stack
							direction="row"
							justifyContent="space-between"
							alignItems="center"
							flexWrap="wrap"
							rowGap={1}
							mb={1.5}
						>
							<Box>
								<Typography variant="h5" sx={{ fontWeight: 700, fontSize: { xs: 18, md: 22 } }}>
									Manage Addresses
								</Typography>
								<Typography color="text.secondary" sx={{ fontSize: 12 }}>
									Set up your pickup and delivery locations for a seamless laundry experience.
								</Typography>
							</Box>
							<Button
								variant="contained"
								size="small"
								startIcon={<BadgePlus size={14} />}
								onClick={() => setDialogOpen(true)}
							>
								Add New Address
							</Button>
						</Stack>

						{pageError && (
							<Typography color="error" sx={{ mb: 1.5, fontSize: 13 }}>
								{pageError}
							</Typography>
						)}

						{/* Summary Cards */}
						<Grid container spacing={1} mb={1.5}>
							{summaryCards.map((card) => (
								<Grid key={card.id} size={{ xs: 12, md: 4 }}>
									<Paper
										elevation={0}
										sx={{
											border: 1,
											borderColor: card.highlight ? "primary.light" : "divider",
											borderRadius: 1,
											p: 1.2,
											bgcolor: card.highlight
												? (theme) => alpha(theme.palette.primary.main, 0.08)
												: "background.paper",
										}}
									>
										<Stack direction="row" spacing={1} alignItems="center">
											<Box
												sx={{
													width: 26,
													height: 26,
													borderRadius: "50%",
													display: "grid",
													placeItems: "center",
													bgcolor: card.highlight
														? "primary.light"
														: (theme) => alpha(theme.palette.text.primary, 0.08),
													color: card.highlight ? "primary.main" : "text.secondary",
												}}
											>
												{card.icon}
											</Box>
											<Box>
												<Typography
													variant="caption"
													sx={{
														textTransform: "uppercase",
														color: card.highlight ? "primary.main" : "text.secondary",
														fontWeight: 700,
														fontSize: 9,
													}}
												>
													{card.title}
												</Typography>
												<Typography sx={{ fontWeight: 700, fontSize: 12 }}>{card.value}</Typography>
											</Box>
										</Stack>
									</Paper>
								</Grid>
							))}
						</Grid>

						{/* Address Cards */}
						<Grid container spacing={1.2}>
							{addresses.map((address) => (
								<Grid key={address.id} size={{ xs: 12, md: 6, lg: 4 }}>
									<Paper
										elevation={0}
										sx={{
											border: 1,
											borderColor: address.isActive
												? "success.light"
												: address.isDefault
												? "primary.light"
												: "divider",
											borderRadius: 1.2,
											p: 1.2,
											height: "100%",
											transition: "border-color 0.2s",
										}}
									>
										{/* Card header */}
										<Stack direction="row" justifyContent="space-between" spacing={1} mb={0.8}>
											<Stack direction="row" spacing={0.6} alignItems="center" flexWrap="wrap" gap={0.4}>
												<MapPin size={12} />
												<Typography sx={{ fontWeight: 700, fontSize: 12 }}>
													{address.label}
												</Typography>
												{address.isDefault && (
													<Chip
														size="small"
														label="Default"
														color="primary"
														variant="outlined"
														sx={{ height: 18, fontSize: 9 }}
													/>
												)}
												{address.isActive && (
													<Chip
														size="small"
														label="Active"
														color="success"
														variant="filled"
														sx={{ height: 18, fontSize: 9 }}
													/>
												)}
											</Stack>
											{!address.isDefault && (
												<Button
													size="small"
													color="error"
													variant="text"
													sx={{ minWidth: 0, p: 0.3 }}
													disabled={isSubmitting}
													onClick={() => handleDelete(address.id)}
												>
													<Trash2 size={13} />
												</Button>
											)}
										</Stack>

										{/* Address text */}
										<Typography
											variant="body2"
											sx={{ color: "text.secondary", mb: 0.8, fontSize: 11, lineHeight: 1.5 }}
										>
											{address.fullAddress}
										</Typography>

										{/* Delivery note */}
										{address.note && (
											<Paper
												variant="outlined"
												sx={{
													p: 0.8,
													mb: 0.9,
													borderRadius: 0.8,
													bgcolor: (theme) => alpha(theme.palette.text.primary, 0.02),
												}}
											>
												<Stack direction="row" spacing={0.6} alignItems="flex-start">
													<Info size={11} />
													<Typography
														variant="caption"
														sx={{ color: "text.secondary", fontStyle: "italic", fontSize: 9 }}
													>
														{address.note}
													</Typography>
												</Stack>
											</Paper>
										)}

										{/* Set as Active button */}
										<Button
											fullWidth
											size="small"
											variant={address.isActive ? "contained" : "outlined"}
											color={address.isActive ? "success" : "primary"}
											disabled={isSubmitting}
											onClick={() => handleSetActive(address.id)}
											startIcon={address.isActive ? <CheckCircle2 size={13} /> : <Zap size={13} />}
											sx={{ fontSize: 11, py: 0.4, height: 28 }}
										>
											{address.isActive ? "Active for Ordering" : "Set as Active"}
										</Button>
									</Paper>
								</Grid>
							))}

							{/* Dashed "add" card */}
							<Grid size={{ xs: 12, md: 6, lg: 4 }}>
								<Paper
									elevation={0}
									onClick={() => setDialogOpen(true)}
									sx={{
										border: 1,
										borderStyle: "dashed",
										borderColor: "divider",
										borderRadius: 1.2,
										height: "100%",
										minHeight: 150,
										display: "grid",
										placeItems: "center",
										textAlign: "center",
										p: 1.5,
										cursor: "pointer",
										transition: "border-color 0.2s, background 0.2s",
										"&:hover": {
											borderColor: "primary.main",
											bgcolor: (theme) => alpha(theme.palette.primary.main, 0.04),
										},
									}}
								>
									<Stack alignItems="center" spacing={0.8}>
										<Box
											sx={{
												width: 30,
												height: 30,
												borderRadius: "50%",
												display: "grid",
												placeItems: "center",
												bgcolor: (theme) => alpha(theme.palette.text.primary, 0.06),
											}}
										>
											<CirclePlus size={16} />
										</Box>
										<Typography sx={{ fontWeight: 700, fontSize: 12 }}>Add another address</Typography>
										<Typography variant="caption" color="text.secondary" sx={{ maxWidth: 140, fontSize: 10 }}>
											Register a friend&apos;s house or your second home.
										</Typography>
									</Stack>
								</Paper>
							</Grid>
						</Grid>

						{/* Tips */}
						<Paper
							elevation={0}
							sx={{
								border: 1,
								borderColor: "divider",
								borderRadius: 1.2,
								p: { xs: 1.2, md: 1.5 },
								mt: 1.5,
							}}
						>
							<Stack direction="row" spacing={0.6} alignItems="center" mb={0.8}>
								<MapPin size={13} />
								<Typography sx={{ fontWeight: 700, fontSize: 13 }}>Laundry Logistics Pro-Tips</Typography>
							</Stack>
							<Divider sx={{ mb: 1 }} />
							<Grid container spacing={1.2}>
								{logisticsTipsMockData.map((tip) => (
									<Grid key={tip.id} size={{ xs: 12, md: 6 }}>
										<Typography sx={{ fontWeight: 700, mb: 0.2, fontSize: 12 }}>{tip.title}</Typography>
										<Typography variant="caption" sx={{ color: "text.secondary", fontSize: 10 }}>
											{tip.description}
										</Typography>
									</Grid>
								))}
							</Grid>
						</Paper>
					</Box>

					<Footer />
				</Box>
			</Box>

			{/* Add Address Dialog */}
			<Dialog open={dialogOpen} onClose={handleDialogClose} fullWidth maxWidth="sm">
				<DialogTitle sx={{ fontWeight: 700, fontSize: 16 }}>Add New Address</DialogTitle>
				<DialogContent>
					<Stack spacing={1.5} sx={{ mt: 0.5 }}>
						{addError && (
							<Typography color="error" sx={{ fontSize: 12 }}>
								{addError}
							</Typography>
						)}
						<Box>
							<Typography variant="caption" sx={{ fontWeight: 700, fontSize: 11, color: "text.secondary" }}>
								Label
							</Typography>
							<TextField
								fullWidth
								size="small"
								placeholder="e.g. Work, Condo, Parents' House"
								value={newLabel}
								onChange={(e) => setNewLabel(e.target.value)}
								sx={{ mt: 0.4 }}
							/>
						</Box>

						<Divider sx={{ my: 0.5 }}>
							<Typography variant="caption" sx={{ color: "text.disabled", fontWeight: 700, textTransform: "uppercase", fontSize: 9 }}>
								Address Details
							</Typography>
						</Divider>

						<Typography variant="caption" color="text.secondary" sx={{ mb: 1 }}>
							We use your address to find nearby stores and schedule pickup.{' '}
							<Typography component={Link} href="/privacy" variant="caption" sx={{ fontWeight: 700, textDecoration: 'none', color: 'primary.main' }}>
								Read our Privacy Policy
							</Typography>
						</Typography>

						<TextField
							fullWidth
							required
							label={signupFormLabels.houseOrUnit}
							size="small"
							value={newHouseOrUnit}
							onChange={(event) => setNewHouseOrUnit(event.target.value)}
							InputProps={{
								startAdornment: (
									<InputAdornment position="start">
										<House size={18} color="#6b7280" />
									</InputAdornment>
								),
							}}
						/>

						<TextField
							select
							fullWidth
							required
							label={signupFormLabels.street}
							size="small"
							value={newStreet}
							onChange={(event) => setNewStreet(event.target.value)}
						>
							{olongapoStreets.map((st) => (
								<MenuItem key={st} value={st}>
									{st}
								</MenuItem>
							))}
						</TextField>

						<TextField
							select
							fullWidth
							required
							label={signupFormLabels.barangay}
							size="small"
							value={newBarangay}
							onChange={(event) => setNewBarangay(event.target.value)}
						>
							{olongapoBarangays.map((barangay) => (
								<MenuItem key={barangay} value={barangay}>
									{barangay}
								</MenuItem>
							))}
						</TextField>

						<TextField
							fullWidth
							label={signupFormLabels.landmark}
							size="small"
							value={newLandmark}
							onChange={(event) => setNewLandmark(event.target.value)}
						/>

						<Stack direction={{ xs: "column", sm: "row" }} spacing={1.2}>
							<TextField
								fullWidth
								label={signupFormLabels.city}
								size="small"
								value={signupReadonlyAddress.city}
								InputProps={{
									readOnly: true,
									startAdornment: (
										<InputAdornment position="start">
											<Building2 size={18} color="#6b7280" />
										</InputAdornment>
									),
								}}
							/>
							<TextField fullWidth label={signupFormLabels.province} size="small" value={signupReadonlyAddress.province} InputProps={{ readOnly: true }} />
						</Stack>

						<Stack direction={{ xs: "column", sm: "row" }} spacing={1.2}>
							<TextField fullWidth label={signupFormLabels.country} size="small" value={signupReadonlyAddress.country} InputProps={{ readOnly: true }} />
							<TextField fullWidth label={signupFormLabels.postalCode} size="small" value={signupReadonlyAddress.postalCode} InputProps={{ readOnly: true }} />
						</Stack>

						<Box>
							<Typography variant="caption" sx={{ fontWeight: 700, fontSize: 11, color: "text.secondary" }}>
								Delivery Note <span style={{ fontWeight: 400 }}>(optional)</span>
							</Typography>
							<TextField
								fullWidth
								size="small"
								placeholder="e.g. Leave at the door, Ring twice, etc."
								value={newNote}
								onChange={(e) => setNewNote(e.target.value)}
								sx={{ mt: 0.4 }}
								multiline
								rows={2}
							/>
						</Box>
					</Stack>
				</DialogContent>
				<DialogActions sx={{ px: 3, pb: 2 }}>
					<Button onClick={handleDialogClose} color="inherit" size="small">
						Cancel
					</Button>
					<Button
						variant="contained"
						size="small"
						onClick={handleAddSubmit}
						disabled={isSubmitting}
					>
						{isSubmitting ? "Saving…" : "Save Address"}
					</Button>
				</DialogActions>
			</Dialog>
		</>
	);
}
