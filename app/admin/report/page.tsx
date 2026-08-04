"use client";

import React from "react";
import { TrendingUp, DollarSign, Users, Eye, Download, RefreshCcw, X } from "lucide-react";
import {
	alpha,
	Avatar,
	Box,
	Button,
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
	Alert,
	IconButton,
	TextField,
} from "@mui/material";
import Sidebar from "../../components/sidebar";
import Footer from "../../components/footer";
import { useReports } from "../../hooks/use-reports";
import type { ReportMetricIcon } from "../../types/dashboard";

function getMetricIcon(icon: ReportMetricIcon | string) {
	const iconProps = { size: 18, strokeWidth: 1.9 };

	switch (icon) {
		case "revenue":
			return <DollarSign {...iconProps} />;
		case "orders":
			return <TrendingUp {...iconProps} />;
		case "customers":
			return <Users {...iconProps} />;
		case "views":
			return <Eye {...iconProps} />;
		default:
			return <TrendingUp {...iconProps} />;
	}
}

export default function ReportPage() {
	const { metrics, serviceReports, weightToday, loading, error, refresh: fetchReports, downloadExcel, timeframe, setTimeframe, fromDate, setFromDate, toDate, setToDate } = useReports();

	if (loading && metrics.length === 0) {
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
			<Box sx={{ display: { xs: "none", md: "block" }, "@media print": { display: "none" } }}>
				<Sidebar />
			</Box>

			<Box
				component="main"
				sx={{
					flex: 1,
					minWidth: 0,
					display: "flex",
					flexDirection: "column",
					"@media print": {
						width: "100%",
						display: "block",
					}
				}}
			>
				<Box sx={{ px: { xs: 1.5, sm: 2, md: 3 }, py: { xs: 1.25, md: 2 }, flex: 1, "@media print": { p: 0 } }}>
					<Stack direction="row" justifyContent="space-between" alignItems="flex-start" mb={2} sx={{ "@media print": { display: "none" } }}>
						<Box>
							<Typography variant="h5" sx={{ fontWeight: 700, fontSize: { xs: 20, md: 24 }, mb: 0.3 }}>
								Report
							</Typography>
							<Typography color="text.secondary" sx={{ fontSize: 12 }}>
								Sales analytics and business metrics overview.
							</Typography>
						</Box>
						<Stack direction="row" spacing={1} alignItems="center" flexWrap="wrap">
							<Stack direction="row" spacing={1} alignItems="center">
								<TextField
									type="date"
									size="small"
									label="From"
									InputLabelProps={{ shrink: true }}
									value={fromDate}
									onChange={(e) => setFromDate(e.target.value)}
									sx={{ width: 140, "& .MuiInputBase-root": { fontSize: 12, height: 32 } }}
									inputProps={{ max: toDate || undefined }}
								/>
								<TextField
									type="date"
									size="small"
									label="To"
									InputLabelProps={{ shrink: true }}
									value={toDate}
									onChange={(e) => setToDate(e.target.value)}
									sx={{ width: 140, "& .MuiInputBase-root": { fontSize: 12, height: 32 } }}
									inputProps={{ min: fromDate || undefined }}
								/>
								{(fromDate || toDate) && (
									<IconButton size="small" onClick={() => { setFromDate(""); setToDate(""); }}>
										<X size={14} />
									</IconButton>
								)}
							</Stack>
							<Box sx={{ bgcolor: "background.paper", borderRadius: 2, border: 1, borderColor: "divider", p: 0.5 }}>
								{["all", "week", "month", "annual"].map((tf) => (
									<Button
										key={tf}
										size="small"
										variant={timeframe === tf ? "contained" : "text"}
										color={timeframe === tf ? "primary" : "inherit"}
										onClick={() => {
											setFromDate("");
											setToDate("");
											setTimeframe(tf as any);
										}}
										disabled={!!(fromDate && toDate)}
										sx={{ 
											borderRadius: 1.5, 
											textTransform: "capitalize", 
											fontSize: 11, 
											minWidth: 0, 
											px: 1.5,
											fontWeight: timeframe === tf ? 700 : 500
										}}
									>
										{tf}
									</Button>
								))}
							</Box>
							<IconButton onClick={fetchReports} disabled={loading} size="small" sx={{ ml: 1 }}>
								<RefreshCcw size={18} className={loading ? "animate-spin" : ""} />
							</IconButton>
						</Stack>
					</Stack>

					{error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}

					<Grid container spacing={1.5} mb={2.5}>
						{metrics.map((metric) => (
							<Grid key={metric.id} size={{ xs: 12, md: 6, lg: 3 }}>
								<Paper
									elevation={0}
									sx={{
										p: 1.5,
										borderRadius: 1.5,
										border: 1,
										borderColor: "divider",
									}}
								>
									<Stack direction="row" justifyContent="space-between" alignItems="flex-start" mb={1}>
										<Avatar
											sx={{
												width: 32,
												height: 32,
												bgcolor: (theme) => alpha(theme.palette.primary.main, 0.13),
												color: "primary.main",
											}}
										>
											{getMetricIcon(metric.icon)}
										</Avatar>
										<Typography
											variant="caption"
											sx={{
												fontWeight: 700,
												fontSize: 10,
												color:
													metric.changeType === "positive"
														? "success.main"
														: "error.main",
											}}
										>
											{metric.change}
										</Typography>
									</Stack>
									<Typography sx={{ fontWeight: 800, fontSize: 18, mb: 0.4 }}>
										{metric.value}
									</Typography>
									<Typography variant="caption" sx={{ color: "text.secondary", fontWeight: 700, fontSize: 11 }}>
										{metric.label}
									</Typography>
								</Paper>
							</Grid>
						))}
					</Grid>

					{/* Weight Utilization Gauge */}
					<Paper 
						elevation={0} 
						sx={{ 
							p: 2.5, 
							mb: 2.5, 
							borderRadius: 1.5, 
							border: 1, 
							borderColor: "divider",
							background: "linear-gradient(135deg, rgba(2, 132, 199, 0.03) 0%, rgba(2, 132, 199, 0.07) 100%)",
						}}
					>
						<Stack spacing={1.5}>
							<Stack direction="row" justifyContent="space-between" alignItems="center">
								<Box>
									<Typography sx={{ fontWeight: 800, fontSize: 15, color: "text.primary" }}>
										Daily Processed Weight Utilization
									</Typography>
									<Typography variant="caption" color="text.secondary">
										Active processed laundry weight against facility daily capacity limit (100 kg)
									</Typography>
								</Box>
								<Typography sx={{ fontWeight: 800, fontSize: 16, color: "primary.main" }}>
									{weightToday || 0} kg / 100 kg
								</Typography>
							</Stack>
							<Box sx={{ width: "100%", bgcolor: alpha("#0284c7", 0.1), borderRadius: 2, height: 10, overflow: "hidden" }}>
								<Box 
									sx={{ 
										width: `${Math.min(100, ((weightToday || 0) / 100) * 100)}%`, 
										bgcolor: (weightToday || 0) > 90 ? "error.main" : (weightToday || 0) > 75 ? "warning.main" : "primary.main", 
										height: "100%",
										transition: "width 0.5s ease-in-out",
										borderRadius: 2
									}} 
								/>
							</Box>
							<Stack direction="row" justifyContent="space-between">
								<Typography variant="caption" sx={{ color: "text.secondary", fontWeight: 600 }}>
									{Math.round(((weightToday || 0) / 100) * 100)}% Capacity Utilized
								</Typography>
								{(weightToday || 0) >= 100 && (
									<Typography variant="caption" sx={{ color: "error.main", fontWeight: 700 }}>
										⚠️ Capacity Limit Reached!
									</Typography>
								)}
							</Stack>
						</Stack>
					</Paper>

					<Paper elevation={0} sx={{ border: 1, borderColor: "divider", borderRadius: 1.5, overflow: "hidden" }}>
						<Box sx={{ p: 2, display: "flex", justifyContent: "space-between", alignItems: "center", borderBottom: 1, borderColor: "divider", bgcolor: "background.paper" }}>
							<Typography variant="h6" sx={{ fontWeight: 700, fontSize: 16 }}>
								Service Performance Report
							</Typography>
							<Button
								size="small"
								variant="contained"
								color="primary"
								startIcon={<Download size={14} />}
								onClick={() => downloadExcel()}
								sx={{ fontSize: 11, fontWeight: 700, borderRadius: 1.5 }}
								disabled={serviceReports.length === 0}
							>
								Export Excel (.xlsx)
							</Button>
						</Box>

						<Box sx={{ overflowX: "auto" }}>
							<Table size="small" sx={{ minWidth: { xs: 620, md: 740 } }}>
								<TableHead>
									<TableRow sx={{ bgcolor: "background.default" }}>
										<TableCell sx={{ fontWeight: 700, fontSize: 11 }}>Service Name</TableCell>
										<TableCell align="right" sx={{ fontWeight: 700, fontSize: 11 }}>
											Orders
										</TableCell>
										<TableCell align="right" sx={{ fontWeight: 700, fontSize: 11 }}>
											Total Income
										</TableCell>
										<TableCell align="right" sx={{ fontWeight: 700, fontSize: 11 }}>
											Avg Value
										</TableCell>
										<TableCell align="right" sx={{ fontWeight: 700, fontSize: 11 }}>
											Growth
										</TableCell>
									</TableRow>
								</TableHead>
								<TableBody>
									{serviceReports.length > 0 ? (
										serviceReports.map((service) => (
											<TableRow key={service.id} sx={{ "&:hover": { bgcolor: "background.default" } }}>
												<TableCell sx={{ fontWeight: 700, fontSize: 12 }}>{service.name}</TableCell>
												<TableCell align="right" sx={{ fontSize: 12 }}>
													{service.orders}
												</TableCell>
												<TableCell align="right" sx={{ fontWeight: 700, fontSize: 12, color: "success.main" }}>
													{service.revenue}
												</TableCell>
												<TableCell align="right" sx={{ fontSize: 12 }}>
													{service.average}
												</TableCell>
												<TableCell align="right" sx={{ fontWeight: 700, fontSize: 11, color: "success.main" }}>
													{service.growth}
												</TableCell>
											</TableRow>
										))
									) : (
										<TableRow>
											<TableCell colSpan={5} align="center" sx={{ py: 4 }}>
												<Typography variant="body2" color="text.secondary">No report data found.</Typography>
											</TableCell>
										</TableRow>
									)}
								</TableBody>
							</Table>
						</Box>
					</Paper>
				</Box>

				<Box sx={{ "@media print": { display: "none" } }}>
					<Footer />
				</Box>
			</Box>
		</Box>
	);
}
