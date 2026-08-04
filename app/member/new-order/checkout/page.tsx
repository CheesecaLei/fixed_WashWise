"use client";

import { useMemo, useState, useEffect, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import {
	BadgeCheck,
	CalendarDays,
	CircleDot,
	Circle,
	Clock3,
	CreditCard,
	MapPin,
	ShieldCheck,
	Sparkles,
	PackageCheck,
	ChevronRight,
	ShoppingBasket,
	Zap,
	Home,
	Building2,
} from "lucide-react";
import Link from "next/link";
import {
	alpha,
	Avatar,
	Box,
	Button,
	Card,
	CardActionArea,
	CardContent,
	Chip,
	CircularProgress,
	Divider,
	Grid,
	InputAdornment,
	MenuItem,
	Paper,
	Stack,
	TextField,
	Typography,
	Collapse,
} from "@mui/material";
import Sidebar from "../../../components/sidebar";
import Footer from "../../../components/footer";
import { toast } from "react-toastify";
import { checkoutPromoDiscount, checkoutTimeSlots, logisticsFee } from "../../../data/new-order";
import { formatPeso } from "../../../lib/currency";
import { useLayoutShell } from "../../../providers/layout-shell-provider";
import { useOrder } from "../../../hooks/use-order";
import { useAddresses, type SavedAddress } from "../../../hooks/use-addresses";
import {
	olongapoBarangays,
	olongapoStreets,
	signupFormLabels,
	signupReadonlyAddress,
} from "../../../data/auth";
import { useRewards } from "../../../hooks/use-rewards";
import { rewardsMilestonesData } from "../../../data/rewards";
import type { ServiceMethod, FetchOrderResponse } from "../../../types/new-order";

function StepTitle({ index, title }: { index: number; title: string }) {
	return (
		<Stack direction="row" alignItems="center" spacing={1} mb={1.4}>
			<Avatar
				sx={{
					width: 20,
					height: 20,
					fontSize: 11,
					fontWeight: 700,
					bgcolor: (theme) => alpha(theme.palette.primary.main, 0.16),
					color: "primary.main",
				}}
			>
				{index}
			</Avatar>
			<Typography sx={{ fontWeight: 700 }}>{title}</Typography>
		</Stack>
	);
}

function CheckoutForm() {
	const searchParams = useSearchParams();
	const orderId = searchParams.get("orderId");
	const { navigate } = useLayoutShell();
	const { fetchOrder, createCheckout, isSubmitting, isLoadingOrder, apiError, fetchTransactions } = useOrder();
	const { fetchAddresses } = useAddresses();

	const [orderData, setOrderData] = useState<FetchOrderResponse["order"] | null>(null);
	const [serviceMethod, setServiceMethod] = useState<ServiceMethod>("pickup");
	const [paymentMethod, setPaymentMethod] = useState<"COD" | "Online">("COD");

	// Address State
	const [savedAddresses, setSavedAddresses] = useState<SavedAddress[]>([]);
	const [selectedAddressId, setSelectedAddressId] = useState<string>("manual");
	const [houseOrUnit, setHouseOrUnit] = useState("");
	const [street, setStreet] = useState("");
	const [barangay, setBarangay] = useState("");
	const [city] = useState(signupReadonlyAddress.city);

	const [selectedSlot, setSelectedSlot] = useState(checkoutTimeSlots[0]);

	// Promo State
	const [hasPreviousPickup, setHasPreviousPickup] = useState<boolean | null>(null);

	// Rewards State
	const { summary } = useRewards();
	const [selectedRewardId, setSelectedRewardId] = useState<string | null>(null);

	useEffect(() => {
		if (orderId) {
			fetchOrder(orderId).then((result) => {
				if (result.success && result.order) {
					setOrderData(result.order);
				}
			});
		}

		fetchAddresses().then((result) => {
			if (result.success) {
				setSavedAddresses(result.addresses);
				// Autofill with active or default address
				const active = result.addresses.find((a) => a.isActive) || result.addresses.find((a) => a.isDefault);
				if (active) {
					setSelectedAddressId(active.id);
					// We'll handle field population in the UI or a separate effect if needed,
					// but for checkout we can just use the selectedAddressId to send the right data.
				}
			}
		});

		fetchTransactions(1).then((result) => {
			if (result.success && result.transactions) {
				const hasPickup = result.transactions.some((t: { serviceMethod: string; orderId: string }) => t.serviceMethod === "pickup" && t.orderId !== orderId);
				setHasPreviousPickup(hasPickup);
			} else {
				setHasPreviousPickup(false);
			}
		});
	}, [orderId, fetchOrder, fetchAddresses, fetchTransactions]);

	const subtotal = orderData ? orderData.subtotal : 0;
	
	const currentPromoDiscount = useMemo(() => {
		if (serviceMethod === "pickup" && hasPreviousPickup === false) {
			return checkoutPromoDiscount;
		}
		return 0;
	}, [serviceMethod, hasPreviousPickup]);

	const currentLogisticsFee = useMemo(() => {
		if (serviceMethod === "pickup") {
			return logisticsFee;
		}
		return 0;
	}, [serviceMethod]);

	const currentRewardDiscount = useMemo(() => {
		if (!selectedRewardId) return 0;
		const milestone = rewardsMilestonesData.find(m => m.id === selectedRewardId);
		return milestone ? milestone.discountAmount : 0;
	}, [selectedRewardId]);

	const finalComputedTotal = Math.max(0, subtotal + currentLogisticsFee - currentPromoDiscount - currentRewardDiscount);

	const serviceFeeLabel = useMemo(() => {
		if (currentLogisticsFee > 0) {
			return `${formatPeso(currentLogisticsFee)} Fee`;
		}
		return "Free";
	}, [currentLogisticsFee]);

	const pickupSelected = serviceMethod === "pickup";
	const dropoffSelected = serviceMethod === "dropoff";

	const handleConfirmOrder = async () => {
		if (!orderId) return;

		let finalStreet = "";
		let finalBarangay = "";
		const finalCity = city;

		if (pickupSelected) {
			if (selectedAddressId === "manual") {
				finalStreet = [houseOrUnit.trim(), street.trim()].filter(Boolean).join(" ");
				finalBarangay = barangay;
			} else {
				const saved = savedAddresses.find((a) => a.id === selectedAddressId);
				if (saved) {
					// We'll need to parse or just use the fullAddress.
					// For now, let's assume the API can take the fullAddress in streetAddress or similar.
					// Or we can try to be smart if the saved address has the same fields.
					// Since our API currently takes streetAddress, barangay, city:
					finalStreet = saved.fullAddress;
					finalBarangay = ""; // It's already in fullAddress
				}
			}
		}

		const result = await createCheckout({
			orderId,
			serviceMethod,
			streetAddress: finalStreet,
			barangay: finalBarangay,
			city: finalCity,
			selectedSlot,
			paymentMethod: paymentMethod,
			logisticsFee: currentLogisticsFee,
			promoDiscount: currentPromoDiscount,
			rewardId: selectedRewardId,
			finalTotal: finalComputedTotal,
		});

		if (result.success) {
			toast.success("Order Placed Successfully!", {
				icon: <span>🧺</span>
			});
			navigate("/member/dashboard");
		}
	};

	if (isLoadingOrder) {
		return (
			<Box sx={{ display: "flex", justifyContent: "center", alignItems: "center", height: "100%", py: 10 }}>
				<CircularProgress />
			</Box>
		);
	}

	if (!orderId || !orderData) {
		return (
			<Box sx={{ p: 4, textAlign: "center" }}>
				<Typography>Order not found or invalid.</Typography>
				<Button onClick={() => navigate("/member/new-order")} sx={{ mt: 2 }} variant="outlined">
					Back to New Order
				</Button>
			</Box>
		);
	}

	return (
		<Box sx={{ px: { xs: 1.5, sm: 2.5, md: 3.5 }, py: { xs: 1.5, md: 3 }, flex: 1 }}>
			<Grid container spacing={2}>
				<Grid size={{ xs: 12, lg: 8.4 }}>
					<Typography variant="h4" sx={{ fontWeight: 800, fontSize: { xs: 24, sm: 28, md: 34 }, mb: 0.4 }}>
						Checkout
					</Typography>
					<Typography color="text.secondary" sx={{ mb: 2 }}>
						Complete your details to schedule your laundry service.
					</Typography>

					<Card sx={{ mb: 1.4 }}>
						<CardContent sx={{ p: 2 }}>
							<StepTitle index={1} title="Service Method" />
							<Grid container spacing={1.2}>
								<Grid size={{ xs: 12, md: 6 }}>
									<Card
										variant="outlined"
										sx={{
											borderColor: pickupSelected ? "primary.main" : "divider",
											bgcolor: pickupSelected
												? (theme) => alpha(theme.palette.primary.main, 0.08)
												: "background.paper",
										}}
									>
										<CardActionArea onClick={() => setServiceMethod("pickup")}>
											<CardContent sx={{ p: 1.5 }}>
												<Stack direction="row" alignItems="center" justifyContent="space-between" spacing={1}>
													<Stack direction="row" spacing={1} alignItems="center">
														<Avatar
															sx={{
																width: 35,
																height: 35,
																bgcolor: pickupSelected ? "primary.main" : "neutral.dark",
																borderRadius: 1,
															}}
															variant="square"
														>
															<MapPin size={20} />
														</Avatar>
														<Box>
															<Typography sx={{ fontWeight: 700, fontSize: 13.5, color: pickupSelected ? "primary.main" : "text.primary" }}>
																Laundry Pickup & Delivery
															</Typography>
															<Typography variant="caption" color="text.secondary">
																We handle everything from your doorstep.
															</Typography>
														</Box>
													</Stack>
													{pickupSelected ? (
														<Box sx={{ color: "primary.main" }}>
															<BadgeCheck size={16} color="currentColor" />
														</Box>
													) : (
														<Box sx={{ color: "text.secondary" }}>
															<Circle size={16} color="currentColor" />
														</Box>
													)}
												</Stack>
												<Typography sx={{ mt: 1, color: "primary.main", fontSize: 12.5, fontWeight: 700 }}>
													{paymentMethod === "Online" ? `+${formatPeso(logisticsFee)} Fee` : "Free for COD"}
												</Typography>
											</CardContent>
										</CardActionArea>
									</Card>
								</Grid>

								<Grid size={{ xs: 12, md: 6 }}>
									<Card
										variant="outlined"
										sx={{
											borderColor: dropoffSelected ? "primary.main" : "divider",
											bgcolor: dropoffSelected
												? (theme) => alpha(theme.palette.primary.main, 0.08)
												: "background.paper",
										}}
									>
										<CardActionArea onClick={() => setServiceMethod("dropoff")}>
											<CardContent sx={{ p: 1.5 }}>
												<Stack direction="row" alignItems="center" justifyContent="space-between" spacing={1}>
													<Stack direction="row" spacing={1} alignItems="center">
														<Avatar
															sx={{
																width: 35,
																height: 35,
																bgcolor: dropoffSelected ? "primary.main" : "neutral.dark",
																borderRadius: 1,
															}}
															variant="square"
														>
															<ShoppingBasket size={20} />
														</Avatar>
														<Box>
															<Typography sx={{ fontWeight: 700, fontSize: 13.5, color: dropoffSelected ? "primary.main" : "text.primary" }}>
																Self Drop-off & Pickup
															</Typography>
															<Typography variant="caption" color="text.secondary">
																Drop your laundry at our shop yourself.
															</Typography>
														</Box>
													</Stack>
													{dropoffSelected ? (
														<Box sx={{ color: "primary.main" }}>
															<BadgeCheck size={16} color="currentColor" />
														</Box>
													) : (
														<Box sx={{ color: "text.secondary" }}>
															<Circle size={16} color="currentColor" />
														</Box>
													)}
												</Stack>
												<Typography sx={{ mt: 1, color: "text.secondary", fontSize: 12.5, fontWeight: 700 }}>Free</Typography>
											</CardContent>
										</CardActionArea>
									</Card>
								</Grid>
							</Grid>
						</CardContent>
					</Card>

					{pickupSelected && (
						<Card sx={{ mb: 1.4 }}>
							<CardContent sx={{ p: 2 }}>
								<StepTitle index={2} title="Pickup Address" />

								{savedAddresses.length > 0 && (
									<Box sx={{ mb: 2 }}>
										<Typography variant="caption" sx={{ color: "text.secondary", fontWeight: 700, mb: 0.5, display: "block" }}>
											Select Saved Address
										</Typography>
										<TextField
											select
											fullWidth
											size="small"
											value={selectedAddressId}
											onChange={(e) => setSelectedAddressId(e.target.value)}
										>
											{savedAddresses.map((addr) => (
												<MenuItem key={addr.id} value={addr.id}>
													<Stack direction="row" spacing={1} alignItems="center">
														<Zap size={14} color={addr.isActive ? "green" : "gray"} />
														<Box>
															<Typography sx={{ fontSize: 13, fontWeight: 600 }}>{addr.label}</Typography>
															<Typography variant="caption" color="text.secondary" sx={{ display: "block", maxWidth: 300, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
																{addr.fullAddress}
															</Typography>
														</Box>
													</Stack>
												</MenuItem>
											))}
											<MenuItem value="manual">
												<Stack direction="row" spacing={1} alignItems="center">
													<MapPin size={14} />
													<Typography sx={{ fontSize: 13, fontWeight: 600 }}>Enter a new address...</Typography>
												</Stack>
											</MenuItem>
										</TextField>
									</Box>
								)}

								<Collapse in={selectedAddressId === "manual" || savedAddresses.length === 0}>
									<Stack spacing={1.2}>
										<Divider sx={{ mb: 0.5 }}>
											<Typography variant="caption" sx={{ color: "text.disabled", fontWeight: 700, textTransform: "uppercase", fontSize: 9 }}>
												Address Details
											</Typography>
										</Divider>

										<Typography variant="caption" color="text.secondary" sx={{ mb: 1, display: "block", bgcolor: "rgba(2, 132, 199, 0.05)", p: 1, borderRadius: 1, borderLeft: "3px solid #0284c7" }}>
											🔒 <strong>Just-In-Time Disclosure:</strong> Your location details are collected solely to coordinate logistics, route drivers, and deliver your laundry. Your data is protected under the Philippine Data Privacy Act (DPA).{' '}
											<Typography component={Link} href="/privacy" variant="caption" sx={{ fontWeight: 700, textDecoration: 'none', color: 'primary.main' }}>
												Learn more in our Privacy Policy.
											</Typography>
										</Typography>

										<TextField
											fullWidth
											required
											label={signupFormLabels.houseOrUnit}
											size="small"
											value={houseOrUnit}
											onChange={(event) => setHouseOrUnit(event.target.value)}
											InputProps={{
												startAdornment: (
													<InputAdornment position="start">
														<Home size={18} color="#6b7280" />
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
											value={street}
											onChange={(event) => setStreet(event.target.value)}
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
											value={barangay}
											onChange={(event) => setBarangay(event.target.value)}
										>
											{olongapoBarangays.map((b) => (
												<MenuItem key={b} value={b}>
													{b}
												</MenuItem>
											))}
										</TextField>

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
									</Stack>
								</Collapse>
							</CardContent>
						</Card>
					)}

					<Card sx={{ mb: 1.4 }}>
						<CardContent sx={{ p: 2 }}>
							<StepTitle index={pickupSelected ? 3 : 2} title="Schedule Time" />
							<Stack direction="row" alignItems="center" spacing={0.8} mb={1.3}>
								<CalendarDays size={13} />
								<Typography sx={{ fontSize: 12.5, color: "text.secondary" }}>Available Slots for Tomorrow, {new Date(new Date().setDate(new Date().getDate() + 1)).toLocaleDateString('en-US', { month: 'long', day: '2-digit' })}</Typography>
							</Stack>

							<Stack direction="row" flexWrap="wrap" gap={0.8} mb={1.5}>
								{checkoutTimeSlots.map((slot) => (
									<Chip
										key={slot}
										icon={selectedSlot === slot ? <CircleDot size={12} /> : <Clock3 size={12} />}
										label={slot}
										clickable
										onClick={() => setSelectedSlot(slot)}
										color={selectedSlot === slot ? "primary" : "default"}
										variant={selectedSlot === slot ? "filled" : "outlined"}
										sx={{
											fontWeight: selectedSlot === slot ? 700 : 500,
											height: 28,
											"& .MuiChip-label": { px: 1 },
										}}
									/>
								))}
							</Stack>

							<Box sx={{ bgcolor: "rgba(2, 132, 199, 0.06)", p: 1.2, borderRadius: 1.5, borderLeft: "4px solid #0284c7", mb: 1.5 }}>
								<Typography variant="caption" sx={{ display: "block", fontWeight: 700, color: "primary.main", mb: 0.3 }}>
									⏱️ Time Frame Rules & No-Show Cancellation Policy:
								</Typography>
								<Typography variant="caption" color="text.secondary" sx={{ display: "block", fontSize: 11, lineHeight: 1.4 }}>
									• <strong>Customer Limit:</strong> 1 active time-slot booking per customer to ensure fair processing.<br />
									• <strong>No-Show Rule:</strong> Courier will wait a maximum of 15 minutes during your selected time window.<br />
									• <strong>Auto Cancellation:</strong> If no show occurs, an email notification will be dispatched and your order will be cancelled.
								</Typography>
							</Box>

							<Paper variant="outlined" sx={{ p: 1.2 }}>
								<Stack direction="row" spacing={1} alignItems="flex-start">
									<CircleDot size={13} />
									<Typography sx={{ fontSize: 12, color: "text.secondary", lineHeight: 1.35 }}>
										Your laundry will be ready for return delivery approximately 24-48 hours after pickup,
										depending on the volume and service type.
									</Typography>
								</Stack>
							</Paper>
						</CardContent>
					</Card>

					<Card>
						<CardContent sx={{ p: 2 }}>
							<StepTitle index={pickupSelected ? 4 : 3} title="Payment Method" />
							<Grid container spacing={1.2}>
								<Grid size={{ xs: 12, md: 6 }}>
									<Card
										variant="outlined"
										sx={{
											borderColor: paymentMethod === "COD" ? "primary.main" : "divider",
											bgcolor: paymentMethod === "COD" ? (theme) => alpha(theme.palette.primary.main, 0.08) : "background.paper",
										}}
									>
										<CardActionArea onClick={() => setPaymentMethod("COD")}>
											<CardContent sx={{ p: 1.5 }}>
												<Stack direction="row" alignItems="center" spacing={1.1}>
													<Avatar sx={{ width: 32, height: 32, bgcolor: paymentMethod === "COD" ? "primary.main" : "neutral.dark" }}>
														<CreditCard size={18} />
													</Avatar>
													<Box>
														<Typography sx={{ fontWeight: 700, fontSize: 13.5, color: paymentMethod === "COD" ? "primary.main" : "text.primary" }}>
															Cash on Delivery (COD)
														</Typography>
														<Typography variant="caption" color="text.secondary">
															No logistics fee applied.
														</Typography>
													</Box>
												</Stack>
											</CardContent>
										</CardActionArea>
									</Card>
								</Grid>
								<Grid size={{ xs: 12, md: 6 }}>
									<Card
										variant="outlined"
										sx={{
											borderColor: paymentMethod === "Online" ? "primary.main" : "divider",
											bgcolor: paymentMethod === "Online" ? (theme) => alpha(theme.palette.primary.main, 0.08) : "background.paper",
										}}
									>
										<CardActionArea onClick={() => setPaymentMethod("Online")}>
											<CardContent sx={{ p: 1.5 }}>
												<Stack direction="row" alignItems="center" spacing={1.1}>
													<Avatar sx={{ width: 32, height: 32, bgcolor: paymentMethod === "Online" ? "primary.main" : "neutral.dark" }}>
														<CreditCard size={18} />
													</Avatar>
													<Box>
														<Typography sx={{ fontWeight: 700, fontSize: 13.5, color: paymentMethod === "Online" ? "primary.main" : "text.primary" }}>
															Online Payment
														</Typography>
														<Typography variant="caption" color="text.secondary">
															Secure payment via Gcash/Card.
														</Typography>
													</Box>
												</Stack>
											</CardContent>
										</CardActionArea>
									</Card>
								</Grid>
							</Grid>
						</CardContent>
					</Card>
				</Grid>

				<Grid size={{ xs: 12, lg: 3.6 }}>
					<Paper sx={{ borderRadius: 2, overflow: "hidden" }}>
						<Box
							sx={{
								px: 2,
								py: 1.2,
								bgcolor: (theme) => alpha(theme.palette.info.main, 0.1),
								borderBottom: 1,
								borderColor: "divider",
							}}
						>
							<Stack direction="row" alignItems="center" spacing={0.8}>
								<Sparkles size={14} />
								<Typography sx={{ fontWeight: 700, color: "info.dark", fontSize: 14 }}>Order Summary</Typography>
							</Stack>
						</Box>

						<Box sx={{ p: 2 }}>
							<Stack spacing={1} mb={1.4}>
								{orderData.services.map((item) => (
									<Stack key={item.id} direction="row" justifyContent="space-between" alignItems="flex-start" spacing={1}>
										<Box>
											<Typography sx={{ fontWeight: 600, fontSize: 13.2 }}>{item.label}</Typography>
											<Typography variant="caption" color="text.secondary">
												{item.quantity} {item.unitLabel}
											</Typography>
										</Box>
										<Typography sx={{ fontWeight: 700, fontSize: 13.2 }}>{formatPeso(item.lineTotal)}</Typography>
									</Stack>
								))}
							</Stack>

							<Divider sx={{ my: 1.2 }} />

							<Stack spacing={0.8}>
								<Stack direction="row" justifyContent="space-between">
									<Typography variant="body2" color="text.secondary">
										Subtotal
									</Typography>
									<Typography variant="body2" sx={{ fontWeight: 700 }}>
										{formatPeso(subtotal)}
									</Typography>
								</Stack>

								<Stack direction="row" justifyContent="space-between">
									<Typography variant="body2" color="text.secondary">
										Logistics Fee
									</Typography>
									<Typography variant="body2" sx={{ fontWeight: 700 }}>
										{serviceFeeLabel}
									</Typography>
								</Stack>

								{hasPreviousPickup === false && serviceMethod === "pickup" && (
									<Stack direction="row" justifyContent="space-between">
										<Typography variant="body2" color="text.secondary">
											Promo: First Ride Free
										</Typography>
										<Typography variant="body2" sx={{ fontWeight: 700, color: "success.main" }}>
											-{formatPeso(currentPromoDiscount)}
										</Typography>
									</Stack>
								)}

								{summary && summary.unlockedRewards.length > 0 && (
									<Box sx={{ mt: 1 }}>
										<Typography variant="caption" sx={{ fontWeight: 700, mb: 0.5, display: "block" }}>
											Apply Loyalty Reward
										</Typography>
										<Stack direction="row" flexWrap="wrap" gap={0.5}>
											{summary.unlockedRewards.map(rewardId => {
												const milestone = rewardsMilestonesData.find(m => m.id === rewardId);
												if (!milestone) return null;
												const isSelected = selectedRewardId === rewardId;
												return (
													<Chip 
														key={rewardId}
														label={milestone.reward}
														size="small"
														variant={isSelected ? "filled" : "outlined"}
														color={isSelected ? "secondary" : "default"}
														onClick={() => setSelectedRewardId(isSelected ? null : rewardId)}
														sx={{ fontSize: 10, fontWeight: 700, height: 24 }}
													/>
												);
											})}
										</Stack>
										{selectedRewardId && (
											<Stack direction="row" justifyContent="space-between" sx={{ mt: 1 }}>
												<Typography variant="body2" color="secondary.main" sx={{ fontWeight: 600 }}>
													Reward Discount
												</Typography>
												<Typography variant="body2" color="secondary.main" sx={{ fontWeight: 700 }}>
													-{formatPeso(currentRewardDiscount)}
												</Typography>
											</Stack>
										)}
									</Box>
								)}

								<Divider sx={{ my: 0.8 }} />
								<Stack direction="row" justifyContent="space-between" alignItems="center" gap={1}>
									<Typography sx={{ fontWeight: 800 }}>Total Amount</Typography>
									<Typography sx={{ fontWeight: 800, color: "primary.main", fontSize: { xs: 24, sm: 29 } }}>
										{formatPeso(finalComputedTotal)}
									</Typography>
								</Stack>
								<Typography variant="caption" color="text.secondary" sx={{ textAlign: "right", display: "block" }}>
									Inclusive of VAT and local taxes
								</Typography>
							</Stack>

							{apiError && (
								<Typography color="error" variant="caption" sx={{ display: "block", textAlign: "center", mt: 1 }}>
									{apiError}
								</Typography>
							)}

							<Button
								fullWidth
								variant="contained"
								sx={{ mt: 2 }}
								disabled={isSubmitting || (pickupSelected && selectedAddressId === "manual" && (!houseOrUnit || !street || !barangay))}
								onClick={handleConfirmOrder}
								endIcon={<ChevronRight size={15} />}
							>
								{isSubmitting ? "Processing..." : "Confirm & Place Order"}
							</Button>

							<Stack direction="row" justifyContent="space-between" spacing={1} sx={{ mt: 2.1 }}>
								<Stack alignItems="center" spacing={0.5} sx={{ flex: 1 }}>
									<ShieldCheck size={14} />
									<Typography sx={{ fontSize: 10.5, color: "text.secondary", textAlign: "center" }}>Quality Check</Typography>
								</Stack>
								<Stack alignItems="center" spacing={0.5} sx={{ flex: 1 }}>
									<PackageCheck size={14} />
									<Typography sx={{ fontSize: 10.5, color: "text.secondary", textAlign: "center" }}>24h Express</Typography>
								</Stack>
								<Stack alignItems="center" spacing={0.5} sx={{ flex: 1 }}>
									<MapPin size={14} />
									<Typography sx={{ fontSize: 10.5, color: "text.secondary", textAlign: "center" }}>Real-time Track</Typography>
								</Stack>
							</Stack>
						</Box>
					</Paper>
				</Grid>
			</Grid>
		</Box>
	);
}

export default function CheckoutPage() {
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
				<Suspense fallback={<Box sx={{ p: 4, textAlign: "center" }}><CircularProgress /></Box>}>
					<CheckoutForm />
				</Suspense>
				<Footer />
			</Box>
		</Box>
	);
}
