"use client";

import { useMemo, useState } from "react";
import { SunMedium, Waves, Flame, ShoppingBasket } from "lucide-react";
import {
	Avatar,
	Box,
	Button,
	Card,
	CardContent,
	Divider,
	Grid,
	Paper,
	Stack,
	TextField,
	Typography,
	CircularProgress,
	Dialog,
	DialogTitle,
	DialogContent,
	DialogContentText,
	DialogActions,
	Alert,
	Chip,
	Select,
	MenuItem,
	IconButton,
	Radio,
	FormControlLabel,
	RadioGroup,
} from "@mui/material";
import { ClipboardList, Plus, Minus, Sparkles } from "lucide-react";
import Sidebar from "../../components/sidebar";
import Footer from "../../components/footer";
import { logisticsFee } from "../../data/new-order";
import { formatPeso } from "../../lib/currency";
import { useLayoutShell } from "../../providers/layout-shell-provider";
import { useOrder } from "../../hooks/use-order";
import { useServices } from "../../hooks/use-services";
import { useOfflineStatus } from "../../hooks/use-offline-status";
import { useOfflineQueue } from "../../providers/offline-queue-provider";
import { toast } from "react-toastify";
import type { ServiceIconName } from "../../types/new-order";

function serviceIcon(iconName: ServiceIconName) {
	switch (iconName) {
		case "waves":
			return <Waves size={18} />;
		case "sun":
			return <SunMedium size={18} />;
		case "flame":
			return <Flame size={18} />;
		default:
			return <Waves size={18} />;
	}
}

export default function NewOrderPage() {
	const { navigate } = useLayoutShell();
	const { createOrder, isSubmitting, apiError } = useOrder();
	const { services, isLoading: isLoadingServices } = useServices();
	const isOffline = useOfflineStatus();
	const { pendingCount } = useOfflineQueue();
	const [specialInstructions, setSpecialInstructions] = useState("");
	const [quantities, setQuantities] = useState<Record<string, string>>({});
	const [pieceCounts, setPieceCounts] = useState<Record<string, Record<string, number>>>({});
	const [isOfflineDialogOpen, setIsOfflineDialogOpen] = useState(false);
	const [assessServiceId, setAssessServiceId] = useState<string | null>(null);
	const [aiSuggestions, setAiSuggestions] = useState<string[]>([
		"Cold wash only",
		"No fabric softener",
		"Fold shirts carefully",
		"Use mild detergent",
		"Separate whites",
	]);
	const [isGeneratingAi, setIsGeneratingAi] = useState(false);

	const PIECE_CATEGORIES = ["T-Shirt", "Polo Shirt", "Pants / Trousers", "Shorts", "Jacket / Hoodie", "Bed Sheet / Blanket", "Towel", "Undergarments", "Others"];

	const selectedServices = useMemo(() => {
		return services
			.map((service) => {
				let value = Number(quantities[service.id] || 0);
				
				if (service.unitLabel === "pc" && pieceCounts[service.id]) {
					value = Object.values(pieceCounts[service.id]).reduce((sum, count) => sum + count, 0);
				}
				
				const quantity = Number.isFinite(value) && value > 0 ? value : 0;

				return {
					...service,
					quantity,
					lineTotal: quantity * service.price,
				};
			})
			.filter((service) => service.quantity > 0);
	}, [quantities, pieceCounts, services]);

	const hasWeightWarning = useMemo(() => {
		return selectedServices.some(s => s.unitLabel === "kg" && s.quantity < 5);
	}, [selectedServices]);

	const subtotal = selectedServices.reduce((sum, service) => sum + service.lineTotal, 0);
	const total = subtotal + logisticsFee;
	const canProceed = selectedServices.length > 0 && !hasWeightWarning;

	const handleQuantityChange = (serviceId: string, value: string) => {
		if (value === "" || /^\d*\.?\d*$/.test(value)) {
			setQuantities((prev) => ({ ...prev, [serviceId]: value }));
		}
	};

	const handleProceed = async () => {
		if (isOffline) {
			setIsOfflineDialogOpen(true);
			return;
		}

		await executeCreateOrder();
	};

	const executeCreateOrder = async () => {
		let finalSpecialInstructions = specialInstructions;
		
		const pieceBreakdowns = selectedServices.filter(s => s.unitLabel === "pc" && pieceCounts[s.id]).map(s => {
			const breakdown = Object.entries(pieceCounts[s.id])
				.filter(([_, count]) => count > 0)
				.map(([cat, count]) => `${count} ${cat}`)
				.join(", ");
			return `${s.label} Assessment: ${breakdown}`;
		});

		if (pieceBreakdowns.length > 0) {
			finalSpecialInstructions += (finalSpecialInstructions ? "\n\n" : "") + pieceBreakdowns.join("\n");
		}

		const result = await createOrder({
			services: selectedServices.map((s) => ({
				id: s.id,
				quantity: s.quantity,
				lineTotal: s.lineTotal,
				label: s.label,
				unitLabel: s.unitLabel,
			})),
			specialInstructions: finalSpecialInstructions,
			subtotal,
		});

		if (result.success) {
			if (result.orderId === "offline-queued") {
				toast.info("Order queued — it will be submitted automatically when you reconnect! 📶", {
					autoClose: 8000,
				});
				// Reset form
				setQuantities({});
				setSpecialInstructions("");
			} else if (result.orderId) {
				navigate(`/member/new-order/checkout?orderId=${result.orderId}`);
			}
		}
	};

	const handleGenerateAiSuggestions = async () => {
		setIsGeneratingAi(true);
		try {
			const serviceNames = selectedServices.map((s) => s.label);
			const res = await fetch("/api/member/ai-instructions", {
				method: "POST",
				headers: { "Content-Type": "application/json" },
				body: JSON.stringify({ serviceNames }),
			});
			const data = await res.json();
			if (data.success && Array.isArray(data.suggestions) && data.suggestions.length > 0) {
				setAiSuggestions(data.suggestions);
				toast.success("AI generated new instruction suggestions! ✨");
			} else {
				toast.error("Could not fetch AI suggestions.");
			}
		} catch (err) {
			console.error(err);
			toast.error("Failed to generate AI suggestions.");
		} finally {
			setIsGeneratingAi(false);
		}
	};

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
					<Grid container spacing={1.5}>
						<Grid size={{ xs: 12, lg: 8.4 }}>
							<Typography variant="h5" sx={{ fontWeight: 700, fontSize: { xs: 18, md: 22 }, mb: 0.3 }}>
								Laundry Services
							</Typography>
							<Typography color="text.secondary" sx={{ mb: 1.5, fontSize: 12 }}>
								Select the services you need and provide an estimate. Final weighing will be done at the
								facility.
							</Typography>

							<Stack spacing={1}>
								{isLoadingServices ? (
									<Box sx={{ display: "flex", justifyContent: "center", py: 4 }}>
										<CircularProgress size={32} />
									</Box>
								) : services.length === 0 ? (
									<Typography sx={{ textAlign: "center", py: 4, color: "text.secondary" }}>
										No services available at the moment.
									</Typography>
								) : (

									services.map((service) => {
										const isSelected = (quantities[service.id] && Number(quantities[service.id]) > 0) || (pieceCounts[service.id] && Object.values(pieceCounts[service.id]).some(c => c > 0));
										return (
											<Card 
												key={service.id} 
												sx={{ 
													borderRadius: 1.5,
													border: 2,
													borderColor: isSelected ? "primary.main" : "divider",
													bgcolor: isSelected ? "rgba(2, 132, 199, 0.03)" : "background.paper",
													transition: "all 0.2s"
												}}
											>
												<CardContent sx={{ p: 1.2, "&:last-child": { pb: 1.2 } }}>
													<Stack direction="row" justifyContent="space-between" spacing={1.5} mb={1}>
														<Stack direction="row" spacing={1} alignItems="center">
															<Radio
																checked={Boolean(isSelected)}
																onChange={() => {
																	if (!isSelected) {
																		if (service.unitLabel.includes("kg")) {
																			handleQuantityChange(service.id, "5");
																		} else {
																			setAssessServiceId(service.id);
																		}
																	} else {
																		handleQuantityChange(service.id, "");
																		setPieceCounts(prev => ({ ...prev, [service.id]: {} }));
																	}
																}}
																size="small"
																color="primary"
															/>
															<Avatar sx={{ width: 28, height: 28, bgcolor: "primary.light", color: "primary.contrastText", flexShrink: 0 }}>
																{serviceIcon(service.iconName)}
															</Avatar>
															<Box>
																<Typography sx={{ fontWeight: 700, fontSize: 13, lineHeight: 1.2 }}>{service.label}</Typography>
																<Typography variant="caption" color="text.secondary" sx={{ fontSize: 10 }}>
																	{service.description}
																</Typography>
															</Box>
														</Stack>
														<Typography sx={{ fontWeight: 800, color: "primary.main", fontSize: 18, whiteSpace: "nowrap" }}>
															{formatPeso(service.price)} / {service.unitLabel}
														</Typography>
													</Stack>
												<Stack direction={{ xs: "column", sm: "row" }} spacing={1} alignItems={{ xs: "flex-start", sm: "center" }}>
													<Typography sx={{ fontSize: 12, fontWeight: 600, color: "text.secondary", minWidth: { xs: 0, sm: 110 } }}>
														{service.inputLabel}
													</Typography>
													
													{service.unitLabel.includes("kg") ? (
														<Select
															size="small"
															value={quantities[service.id] || ""}
															onChange={(event) => handleQuantityChange(service.id, event.target.value as string)}
															displayEmpty
															sx={{ width: { xs: "100%", sm: 100 }, maxWidth: 180, height: 32, fontSize: 13 }}
														>
															<MenuItem value="" disabled sx={{ fontSize: 13 }}>Select weight</MenuItem>
															{Array.from({ length: 26 }, (_, i) => i + 5).map((num) => (
																<MenuItem key={num} value={num.toString()} sx={{ fontSize: 13 }}>{num}</MenuItem>
															))}
														</Select>
													) : (
														<Button
															variant="outlined"
															size="small"
															onClick={() => setAssessServiceId(service.id)}
															sx={{ height: 32, minWidth: 100, fontSize: 12 }}
														>
															{pieceCounts[service.id] && Object.values(pieceCounts[service.id]).some(c => c > 0)
																? `Edit Pieces (${Object.values(pieceCounts[service.id]).reduce((a, b) => a + b, 0)})`
																: "Assess Pieces"}
														</Button>
													)}
													
													<Typography variant="caption" color="text.secondary" sx={{ fontSize: 11 }}>
														{service.unitLabel}
													</Typography>
												</Stack>
											</CardContent>
										</Card>
									);
								})
								)}
							</Stack>

							<Box mt={1.5}>
								<Stack direction="row" alignItems="center" justifyContent="space-between" mb={0.8}>
									<Typography variant="h6" sx={{ fontSize: 14, fontWeight: 700 }}>
										Special Instructions
									</Typography>
									<Button
										size="small"
										variant="outlined"
										color="primary"
										onClick={handleGenerateAiSuggestions}
										disabled={isGeneratingAi}
										startIcon={isGeneratingAi ? <CircularProgress size={12} color="inherit" /> : <Sparkles size={13} />}
										sx={{ fontSize: 11, textTransform: "none", py: 0.2, px: 1, borderRadius: 1.5, fontWeight: 700 }}
									>
										{isGeneratingAi ? "Generating AI..." : "Generate AI Suggestions ✨"}
									</Button>
								</Stack>
								<TextField
									multiline
									minRows={3}
									value={specialInstructions}
									onChange={(event) => setSpecialInstructions(event.target.value)}
									placeholder="E.g., use mild detergent for the white shirts, delicate handling for silk..."
									size="small"
									fullWidth
								/>
								<Stack direction="row" spacing={1} sx={{ mt: 1, overflowX: "auto", pb: 0.5, "::-webkit-scrollbar": { display: "none" } }}>
									{aiSuggestions.map((suggestion) => (
										<Chip
											key={suggestion}
											label={suggestion}
											size="small"
											onClick={() => setSpecialInstructions((prev) => prev ? `${prev}, ${suggestion}` : suggestion)}
											sx={{ fontSize: 10, bgcolor: "action.hover", cursor: "pointer", "&:hover": { bgcolor: "action.selected" } }}
										/>
									))}
								</Stack>
								<Typography variant="caption" color="text.secondary" sx={{ mt: 0.6, display: "block", fontSize: 10 }}>
									Your instructions help us treat your clothes with the care they deserve.
								</Typography>
							</Box>
						</Grid>

						<Grid size={{ xs: 12, lg: 3.6 }}>
							<Paper sx={{ borderRadius: 1.2, overflow: "hidden" }}>
								<Box sx={{ px: 1.2, py: 0.8, bgcolor: "rgba(2, 132, 199, 0.08)", borderBottom: 1, borderColor: "divider" }}>
									<Stack direction="row" alignItems="center" spacing={0.8}>
										<ClipboardList size={13} />
										<Typography sx={{ fontWeight: 700, color: "info.dark", fontSize: 12 }}>Financial Breakdown</Typography>
									</Stack>
								</Box>
								<Box sx={{ p: 1.2 }}>
									{selectedServices.length === 0 ? (
										<Typography sx={{ color: "text.secondary", fontSize: 11, textAlign: "center", py: 1.5 }}>
											No services selected yet
										</Typography>
									) : (
										<Stack spacing={0.6} mb={1.2}>
											{selectedServices.map((service) => (
												<Stack key={service.id} direction="row" alignItems="center" justifyContent="space-between">
													<Typography variant="caption" color="text.secondary" sx={{ fontSize: 10 }}>
														{service.label} ({service.quantity} {service.unitLabel})
													</Typography>
													<Typography variant="caption" sx={{ fontWeight: 700, fontSize: 10 }}>
														{formatPeso(service.lineTotal)}
													</Typography>
												</Stack>
											))}
										</Stack>
									)}

									<Stack spacing={0.8}>
										<Stack direction="row" justifyContent="space-between">
											<Typography variant="caption" color="text.secondary" sx={{ fontSize: 10 }}>
												Subtotal
											</Typography>
											<Typography variant="caption" sx={{ fontWeight: 700, fontSize: 10 }}>
												{formatPeso(subtotal)}
											</Typography>
										</Stack>
										<Stack direction="row" justifyContent="space-between">
											<Typography variant="caption" color="text.secondary" sx={{ fontSize: 10 }}>
												Logistics (Delivery)
											</Typography>
											<Typography variant="caption" sx={{ fontWeight: 700, fontSize: 10 }}>
												{formatPeso(logisticsFee)}
											</Typography>
										</Stack>
										<Divider />
										<Stack direction="row" justifyContent="space-between" alignItems="center">
											<Typography sx={{ fontWeight: 700, fontSize: 11 }}>TOTAL</Typography>
											<Typography sx={{ fontWeight: 800, color: "primary.main", fontSize: 18 }}>
												{formatPeso(total)}
											</Typography>
										</Stack>
									</Stack>

									{hasWeightWarning && (
										<Alert severity="warning" sx={{ mt: 1.5, mb: 1, py: 0.25, px: 1, "& .MuiAlert-message": { fontSize: 10 } }}>
											Minimum weight is 5 kg per service.
										</Alert>
									)}
 
									{apiError && (
										<Typography color="error" variant="caption" sx={{ display: "block", textAlign: "center", mb: 1 }}>
											{apiError}
										</Typography>
									)}
									<Button
										fullWidth
										variant="contained"
										disabled={!canProceed || isSubmitting}
										size="small"
										startIcon={<ShoppingBasket size={14} />}
										sx={{ mt: 1.2, fontSize: 12, py: 0.6 }}
										onClick={handleProceed}
									>
										{isSubmitting
											? "Processing..."
											: isOffline
											? `Queue Order${pendingCount > 0 ? ` (${pendingCount} pending)` : " (Offline)"}`
											: "Proceed to Checkout"}
									</Button>

									<Typography variant="caption" sx={{ color: "text.secondary", textAlign: "center", display: "block", mt: 0.8, fontSize: 9 }}>
										PRICES INCLUDE 12% VAT
									</Typography>
								</Box>
							</Paper>
						</Grid>
					</Grid>
				</Box>

				<Footer />
			</Box>

			<Dialog
			open={isOfflineDialogOpen}
			onClose={() => setIsOfflineDialogOpen(false)}
			PaperProps={{ sx: { borderRadius: 3, p: 1, maxWidth: 400, width: "100%" } }}
		>
			<DialogTitle sx={{ fontWeight: 800 }}>Queue Order Offline</DialogTitle>
			<DialogContent>
				<DialogContentText sx={{ mb: 2, fontSize: 13 }}>
					You&apos;re offline. Your order will be saved locally and automatically submitted when you reconnect.
					You&apos;ll be prompted to complete checkout (pickup method &amp; payment) once it syncs.
				</DialogContentText>

				{/* Order summary */}
				<Paper variant="outlined" sx={{ p: 1.5, bgcolor: "rgba(2, 132, 199, 0.04)", borderColor: "info.light", mb: 1.5 }}>
					<Typography variant="caption" sx={{ fontWeight: 700, display: "block", mb: 1, color: "info.dark" }}>
						Order Summary
					</Typography>
					<Stack spacing={0.5}>
						{selectedServices.map((s) => (
							<Stack key={s.id} direction="row" justifyContent="space-between">
								<Typography variant="caption" color="text.secondary">
									{s.label} × {s.quantity} {s.unitLabel}
								</Typography>
								<Typography variant="caption" fontWeight={700}>
									{formatPeso(s.lineTotal)}
								</Typography>
							</Stack>
						))}
						<Divider sx={{ my: 0.5 }} />
						<Stack direction="row" justifyContent="space-between">
							<Typography variant="caption" fontWeight={700}>Est. Total</Typography>
							<Typography variant="caption" fontWeight={800} color="primary.main">
								{formatPeso(total)}
							</Typography>
						</Stack>
					</Stack>
				</Paper>

				{pendingCount > 0 && (
					<Typography variant="caption" color="text.secondary" sx={{ display: "block" }}>
						📋 You already have {pendingCount} order{pendingCount === 1 ? "" : "s"} queued.
					</Typography>
				)}
			</DialogContent>
			<DialogActions sx={{ px: 3, pb: 2 }}>
				<Button onClick={() => setIsOfflineDialogOpen(false)} color="inherit" size="small">
					Cancel
				</Button>
				<Button
					onClick={() => {
						setIsOfflineDialogOpen(false);
						executeCreateOrder();
					}}
					variant="contained"
					autoFocus
					size="small"
					sx={{ borderRadius: 2 }}
				>
					Confirm &amp; Queue
				</Button>
			</DialogActions>
		</Dialog>

		<Dialog
			open={Boolean(assessServiceId)}
			onClose={() => setAssessServiceId(null)}
			PaperProps={{ sx: { borderRadius: 3, p: 1, maxWidth: 400, width: "100%" } }}
		>
			<DialogTitle sx={{ fontWeight: 800 }}>Assess Pieces</DialogTitle>
			<DialogContent>
				<DialogContentText sx={{ mb: 2, fontSize: 13 }}>
					Specify the quantities for each category of clothing.
				</DialogContentText>
				<Stack spacing={1.5}>
					{PIECE_CATEGORIES.map((category) => {
						const count = assessServiceId && pieceCounts[assessServiceId]?.[category] ? pieceCounts[assessServiceId][category] : 0;
						return (
							<Stack key={category} direction="row" justifyContent="space-between" alignItems="center">
								<Typography sx={{ fontSize: 13, fontWeight: 600 }}>{category}</Typography>
								<Stack direction="row" alignItems="center" spacing={1}>
									<IconButton
										size="small"
										onClick={() => {
											if (assessServiceId && count > 0) {
												setPieceCounts(prev => ({
													...prev,
													[assessServiceId]: { ...prev[assessServiceId], [category]: count - 1 }
												}));
											}
										}}
									>
										<Minus size={16} />
									</IconButton>
									<Typography sx={{ minWidth: 24, textAlign: "center", fontWeight: 700 }}>{count}</Typography>
									<IconButton
										size="small"
										onClick={() => {
											if (assessServiceId) {
												setPieceCounts(prev => ({
													...prev,
													[assessServiceId]: { ...prev[assessServiceId], [category]: count + 1 }
												}));
											}
										}}
									>
										<Plus size={16} />
									</IconButton>
								</Stack>
							</Stack>
						);
					})}
				</Stack>
			</DialogContent>
			<DialogActions sx={{ px: 3, pb: 2 }}>
				<Button onClick={() => setAssessServiceId(null)} variant="contained" size="small" sx={{ borderRadius: 2 }}>
					Done
				</Button>
			</DialogActions>
		</Dialog>
		</Box>
	);
}
