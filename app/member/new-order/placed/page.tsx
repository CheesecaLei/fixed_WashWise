"use client";

import { useState, useEffect, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import {
	ArrowLeft,
	BadgeCheck,
	ChevronRight,
	Clock3,
	MapPin,
	PackageCheck,
	ClipboardList,
	CircleDot,
} from "lucide-react";
import { alpha, Box, Button, Card, CardContent, Chip, Divider, Grid, Paper, Stack, Typography, CircularProgress } from "@mui/material";
import Sidebar from "../../../components/sidebar";
import Footer from "../../../components/footer";
import { formatPeso } from "../../../lib/currency";
import { useLayoutShell } from "../../../providers/layout-shell-provider";
import { useOrder } from "../../../hooks/use-order";
import type { FetchTransactionResponse } from "../../../types/new-order";

function PlacedOrderDetails() {
	const searchParams = useSearchParams();
	const transactionId = searchParams.get("transactionId");
	const { navigate } = useLayoutShell();
	const { fetchTransaction, isLoadingOrder } = useOrder();
	const [data, setData] = useState<FetchTransactionResponse["transaction"] | null>(null);

	useEffect(() => {
		if (transactionId) {
			fetchTransaction(transactionId).then((result) => {
				if (result.success && result.transaction) {
					setData(result.transaction);
				}
			});
		}
	}, [transactionId, fetchTransaction]);

	if (isLoadingOrder) {
		return (
			<Box sx={{ display: "flex", justifyContent: "center", alignItems: "center", height: "100%", py: 10 }}>
				<CircularProgress />
			</Box>
		);
	}

	if (!transactionId || !data) {
		return (
			<Box sx={{ p: 4, textAlign: "center" }}>
				<Typography>Order details not found.</Typography>
				<Button onClick={() => navigate("/member/new-order")} sx={{ mt: 2 }} variant="outlined">
					Back to New Order
				</Button>
			</Box>
		);
	}

	const orderId = data.orderId.slice(-6).toUpperCase();
	const services = data.order?.services || [];

	return (
		<Box sx={{ px: { xs: 1.5, sm: 2.5, md: 3.5 }, py: { xs: 1.5, md: 3 }, flex: 1 }}>
			<style>{`
				@media print {
					body, html, main {
						background: white !important;
						color: black !important;
					}
					aside, footer, .no-print, button, .MuiButton-root {
						display: none !important;
					}
					#print-invoice-card {
						border: 1px solid #ddd !important;
						box-shadow: none !important;
						margin: 0 !important;
						padding: 20px !important;
						width: 100% !important;
						position: absolute;
						left: 0;
						top: 0;
					}
				}
			`}</style>
			<Stack className="no-print" alignItems="center" textAlign="center" spacing={1} mb={{ xs: 2, md: 3 }}>
				<BadgeCheck size={38} color="#10b981" />
				<Typography variant="h4" sx={{ fontWeight: 800, fontSize: { xs: 24, sm: 30, md: 40 } }}>
					Order Placed Successfully!
				</Typography>
				<Typography sx={{ color: "text.secondary", maxWidth: 560 }}>
					Your laundry order has been received. Our team will arrive at your location shortly for pickup.
				</Typography>
			</Stack>

			<Grid container spacing={2}>
				<Grid size={{ xs: 12, lg: 8 }}>
					<Card id="print-invoice-card" sx={{ mb: 1.4 }}>
						<CardContent sx={{ p: 2 }}>
							<Stack direction="row" alignItems="center" justifyContent="space-between" sx={{ mb: 1.5 }}>
								<Box>
									<Typography variant="caption" color="text.secondary" sx={{ textTransform: "uppercase" }}>
										Order ID
									</Typography>
									<Typography sx={{ fontWeight: 800, fontSize: { xs: 22, md: 28 }, lineHeight: 1 }}>#{orderId}</Typography>
								</Box>
								<Chip label={`Payment: ${data.paymentMethod}`} size="small" variant="outlined" color="primary" sx={{ fontWeight: 700 }} />
							</Stack>

							<Divider sx={{ my: 1.4 }} />

							<Stack direction="row" alignItems="center" spacing={0.8} mb={1.1}>
								<ClipboardList size={14} />
								<Typography sx={{ fontWeight: 700, fontSize: 14 }}>Order Summary</Typography>
							</Stack>

							<Stack spacing={1}>
								<Box
									sx={{
										display: "grid",
										gridTemplateColumns: { xs: "minmax(0, 1fr)", sm: "minmax(0, 1fr) 88px 84px" },
										columnGap: 8,
										color: "text.secondary",
										fontSize: 12,
									}}
								>
									<Typography variant="caption">Service</Typography>
									<Typography variant="caption" sx={{ textAlign: { xs: "left", sm: "right" }, mt: { xs: 0.4, sm: 0 } }}>
										Qty/Wt
									</Typography>
									<Typography variant="caption" sx={{ textAlign: { xs: "left", sm: "right" } }}>
										Price
									</Typography>
								</Box>

								{services.map((item) => (
									<Box
										key={item.id}
										sx={{ display: "grid", gridTemplateColumns: { xs: "minmax(0, 1fr)", sm: "minmax(0, 1fr) 88px 84px" }, columnGap: 8, alignItems: "center" }}
									>
										<Typography sx={{ fontWeight: 600, fontSize: 13.5 }}>{item.label}</Typography>
										<Typography sx={{ color: "text.secondary", textAlign: { xs: "left", sm: "right" }, fontSize: 13.5 }}>
											{item.quantity} {item.unitLabel}
										</Typography>
										<Typography sx={{ textAlign: { xs: "left", sm: "right" }, fontWeight: 700, fontSize: 13.5 }}>
											{formatPeso(item.lineTotal)}
										</Typography>
									</Box>
								))}
								
								{data.logisticsFee > 0 && (
									<Box sx={{ display: "grid", gridTemplateColumns: { xs: "minmax(0, 1fr)", sm: "minmax(0, 1fr) 88px 84px" }, columnGap: 8, alignItems: "center" }}>
										<Typography sx={{ fontWeight: 600, fontSize: 13.5 }}>Logistics Fee</Typography>
										<Typography sx={{ color: "text.secondary", textAlign: { xs: "left", sm: "right" }, fontSize: 13.5 }}>Standard</Typography>
										<Typography sx={{ textAlign: { xs: "left", sm: "right" }, fontWeight: 700, fontSize: 13.5 }}>
											{formatPeso(data.logisticsFee)}
										</Typography>
									</Box>
								)}

								{data.promoDiscount > 0 && (
									<Box sx={{ display: "grid", gridTemplateColumns: { xs: "minmax(0, 1fr)", sm: "minmax(0, 1fr) 88px 84px" }, columnGap: 8, alignItems: "center" }}>
										<Typography sx={{ fontWeight: 600, fontSize: 13.5, color: "success.main" }}>Promo: First Ride Free</Typography>
										<Typography sx={{ color: "text.secondary", textAlign: { xs: "left", sm: "right" }, fontSize: 13.5 }}>Discount</Typography>
										<Typography sx={{ textAlign: { xs: "left", sm: "right" }, fontWeight: 700, fontSize: 13.5, color: "success.main" }}>
											-{formatPeso(data.promoDiscount)}
										</Typography>
									</Box>
								)}
							</Stack>

							<Divider sx={{ my: 1.6 }} />

							<Stack direction="row" justifyContent="space-between" alignItems="center">
								<Typography sx={{ fontWeight: 800, fontSize: { xs: 18, md: 24 } }}>Total Amount</Typography>
								<Typography sx={{ fontWeight: 800, color: "primary.main", fontSize: { xs: 28, md: 38 } }}>
									{formatPeso(data.finalTotal)}
								</Typography>
							</Stack>
						</CardContent>
					</Card>

					<Grid container spacing={1.2}>
						<Grid size={{ xs: 12, md: 6 }}>
							<Paper variant="outlined" sx={{ p: 1.5, borderRadius: 2, height: "100%" }}>
								<Stack direction="row" alignItems="center" spacing={0.8} mb={0.9}>
									<MapPin size={13} />
									<Typography variant="caption" sx={{ color: "text.secondary", fontWeight: 700 }}>
										{data.serviceMethod === "pickup" ? "PICKUP ADDRESS" : "DROP-OFF METHOD"}
									</Typography>
								</Stack>
								{data.serviceMethod === "pickup" ? (
									<>
										<Typography sx={{ fontWeight: 700, lineHeight: 1.2 }}>Customer Location</Typography>
										<Typography variant="body2" color="text.secondary">
											{data.streetAddress}, {data.barangay}, {data.city}
										</Typography>
									</>
								) : (
									<Typography sx={{ fontWeight: 700, lineHeight: 1.2 }}>Self Drop-off at Shop</Typography>
								)}
							</Paper>
						</Grid>

						<Grid size={{ xs: 12, md: 6 }}>
							<Paper variant="outlined" sx={{ p: 1.5, borderRadius: 2, height: "100%" }}>
								<Stack direction="row" alignItems="center" spacing={0.8} mb={0.9}>
									<PackageCheck size={13} />
									<Typography variant="caption" sx={{ color: "text.secondary", fontWeight: 700 }}>
										SERVICE TYPE
									</Typography>
								</Stack>
								<Typography sx={{ fontWeight: 700, lineHeight: 1.2 }}>
									{data.serviceMethod === "pickup" ? "Full Logistics Support" : "In-shop Service"}
								</Typography>
								<Typography variant="body2" color="text.secondary">
									Scheduled: {data.selectedSlot}
								</Typography>
							</Paper>
						</Grid>
					</Grid>
				</Grid>

				<Grid size={{ xs: 12, lg: 4 }} className="no-print">
					<Paper
						sx={{
							p: 1.8,
							mb: 1.4,
							bgcolor: (theme) => alpha(theme.palette.info.main, 0.08),
							border: 1,
							borderColor: (theme) => alpha(theme.palette.info.main, 0.18),
						}}
					>
						<Stack direction="row" alignItems="center" spacing={0.8} mb={1.1}>
							<Clock3 size={14} />
							<Typography sx={{ fontWeight: 700, fontSize: 14 }}>Expected Timeline</Typography>
						</Stack>
						<Stack spacing={1.3}>
							<Stack direction="row" spacing={1} alignItems="flex-start">
								<Box sx={{ color: "info.main", mt: 0.2 }}>
									<CircleDot size={14} />
								</Box>
								<Box>
									<Typography sx={{ fontWeight: 700, lineHeight: 1.1, fontSize: 13.5 }}>{data.serviceMethod === "pickup" ? "Pickup" : "Drop-off"}</Typography>
									<Typography variant="caption" color="text.secondary">
										Tomorrow, {data.selectedSlot}
									</Typography>
								</Box>
							</Stack>
							<Stack direction="row" spacing={1} alignItems="flex-start">
								<Box sx={{ color: "text.secondary", mt: 0.2 }}>
									<CircleDot size={14} />
								</Box>
								<Box>
									<Typography sx={{ fontWeight: 700, lineHeight: 1.1, fontSize: 13.5 }}>Processing</Typography>
									<Typography variant="caption" color="text.secondary">
										Expected 24-48 hours after arrival
									</Typography>
								</Box>
							</Stack>
						</Stack>
					</Paper>

					<Button
						fullWidth
						variant="contained"
						sx={{ mb: 1 }}
						onClick={() => navigate("/member/dashboard")}
						endIcon={<ChevronRight size={15} />}
					>
						Go to Dashboard
					</Button>

					<Button
						fullWidth
						variant="outlined"
						sx={{ mb: 1, borderColor: "info.main", color: "info.main", "&:hover": { borderColor: "info.dark" } }}
						onClick={() => window.print()}
						startIcon={<span>🖨️</span>}
					>
						Print Receipt
					</Button>

					<Button
						fullWidth
						variant="outlined"
						sx={{ mb: 1.4 }}
						onClick={() => navigate("/member/new-order")}
						startIcon={<ArrowLeft size={14} />}
					>
						Place New Order
					</Button>

					<Paper variant="outlined" sx={{ p: 1.6, textAlign: "center" }}>
						<Typography variant="caption" color="text.secondary" sx={{ display: "block", mb: 0.2 }}>
							Need help with your order?
						</Typography>
						<Button variant="text" size="small" onClick={() => navigate("/member/dashboard")}>
							Contact Support
						</Button>
					</Paper>
				</Grid>
			</Grid>
		</Box>
	);
}

export default function OrderPlacedPage() {
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
					<PlacedOrderDetails />
				</Suspense>
				<Footer />
			</Box>
		</Box>
	);
}
