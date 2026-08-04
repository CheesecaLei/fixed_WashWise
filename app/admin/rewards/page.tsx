"use client";

import { useEffect, useState, useCallback } from "react";
import {
	Trophy,
	Users,
	Gift,
	Coins,
} from "lucide-react";
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
	Divider,
	Chip,
	Table,
	TableBody,
	TableCell,
	TableContainer,
	TableHead,
	TableRow,
} from "@mui/material";
import Sidebar from "../../components/sidebar";
import Footer from "../../components/footer";
import PremiumPagination from "../../components/pagination";

interface UserTier {
	userId: string;
	username: string;
	tier: string;
	totalPoints: number;
	completedOrders: number;
}

interface Redemption {
	id: string;
	username: string;
	points: number;
	description: string;
	createdAt: string;
}

interface RewardsData {
	stats?: {
		totalPointsAwarded?: number;
		totalPointsRedeemed?: number;
		totalMembers?: number;
		tierCounts?: {
			vip?: number;
		};
	};
	userTiers?: UserTier[];
	recentRedemptions?: Redemption[];
	pagination?: {
		total: number;
		totalPages: number;
		limit: number;
	};
}

export default function AdminRewardsPage() {
	const [data, setData] = useState<RewardsData | null>(null);
	const [loading, setLoading] = useState(true);
	const [error, setError] = useState<string | null>(null);
	const [page, setPage] = useState(1);

	const fetchData = useCallback((pageNum: number = 1) => {
		setLoading(true);
		fetch(`/api/admin/rewards?page=${pageNum}&limit=10`)
			.then((res) => res.json())
			.then((data) => {
				if (data.error) setError(data.error);
				else setData(data);
				setLoading(false);
			})
			.catch(() => {
				setError("Failed to fetch rewards data");
				setLoading(false);
			});
	}, []);

	useEffect(() => {
		// eslint-disable-next-line react-hooks/set-state-in-effect
		fetchData(page);
	}, [fetchData, page]);

	if (loading && !data) {
		return (
			<Box sx={{ minHeight: "100dvh", display: "flex", bgcolor: "background.default" }}>
				<Sidebar />
				<Box sx={{ flex: 1, display: "flex", justifyContent: "center", alignItems: "center" }}>
					<CircularProgress />
				</Box>
			</Box>
		);
	}

	const statsCards = [
		{ id: "points", label: "Total Points Awarded", value: data?.stats?.totalPointsAwarded || 0, color: "primary", icon: <Coins size={20} /> },
		{ id: "redeemed", label: "Points Redeemed", value: data?.stats?.totalPointsRedeemed || 0, color: "secondary", icon: <Gift size={20} /> },
		{ id: "members", label: "Active Members", value: data?.stats?.totalMembers || 0, color: "success", icon: <Users size={20} /> },
		{ id: "vip", label: "VIP Members", value: data?.stats?.tierCounts?.vip || 0, color: "warning", icon: <Trophy size={20} /> },
	];

	return (
		<Box sx={{ minHeight: "100dvh", display: "flex", bgcolor: "background.default" }}>
			<Sidebar />

			{/* minWidth:0 lets wide children (tables) scroll internally instead of
			    stretching the page and forcing a horizontal scrollbar. */}
			<Box component="main" sx={{ flex: 1, minWidth: 0, display: "flex", flexDirection: "column" }}>
				<Box sx={{ px: { xs: 1.5, sm: 2, md: 3 }, py: { xs: 2, md: 3 }, flex: 1, overflowY: "auto" }}>
					<Stack direction="row" justifyContent="space-between" alignItems="flex-start" mb={3}>
						<Box>
							<Typography variant="h5" sx={{ fontWeight: 800 }}>
								Loyalty Analytics
							</Typography>
							<Typography variant="body2" color="text.secondary">
								Monitor point accumulation, tier progression, and reward redemptions.
							</Typography>
						</Box>
					</Stack>

					{error && <Alert severity="error" sx={{ mb: 3 }}>{error}</Alert>}

					<Grid container spacing={3} mb={4}>
						{statsCards.map((stat) => (
							<Grid key={stat.id} size={{ xs: 12, sm: 6, md: 3 }}>
								<Paper elevation={0} sx={{ p: 2.5, borderRadius: 4, border: "1px solid", borderColor: "divider" }}>
									<Stack direction="row" spacing={2} alignItems="center">
										<Avatar sx={{ bgcolor: alpha((stat.color === 'primary' ? '#3f51b5' : stat.color === 'secondary' ? '#8a2387' : stat.color === 'success' ? '#4caf50' : '#ff9800'), 0.1), color: stat.color + ".main" }}>
											{stat.icon}
										</Avatar>
										<Box>
											<Typography variant="h4" sx={{ fontWeight: 900, lineHeight: 1 }}>{stat.value}</Typography>
											<Typography variant="caption" sx={{ fontWeight: 700, color: "text.secondary" }}>{stat.label}</Typography>
										</Box>
									</Stack>
								</Paper>
							</Grid>
						))}
					</Grid>

					<Grid container spacing={3}>
						<Grid size={{ xs: 12, lg: 8 }}>
							<Paper elevation={0} sx={{ p: 3, borderRadius: 4, border: "1px solid", borderColor: "divider", mb: 3 }}>
								<Typography variant="h6" sx={{ fontWeight: 800, mb: 2 }}>Member Tiers</Typography>
								<TableContainer>
									{/* minWidth keeps columns legible; TableContainer scrolls horizontally below it. */}
									<Table size="small" sx={{ minWidth: 480 }}>
										<TableHead>
											<TableRow>
												<TableCell sx={{ fontWeight: 800 }}>Member</TableCell>
												<TableCell sx={{ fontWeight: 800 }}>Tier</TableCell>
												<TableCell sx={{ fontWeight: 800 }} align="right">Points</TableCell>
												<TableCell sx={{ fontWeight: 800 }} align="right">Orders</TableCell>
											</TableRow>
										</TableHead>
										<TableBody>
											{data?.userTiers?.map((user: UserTier) => (
												<TableRow key={user.userId}>
													<TableCell>
														<Stack direction="row" spacing={1.5} alignItems="center">
															<Avatar sx={{ width: 30, height: 30, fontSize: 14 }}>{user.username[0].toUpperCase()}</Avatar>
															<Typography sx={{ fontWeight: 700 }}>{user.username}</Typography>
														</Stack>
													</TableCell>
													<TableCell>
														<Chip 
															label={user.tier.toUpperCase()} 
															size="small" 
															color={user.tier === 'vip' ? 'primary' : user.tier === 'loyal' ? 'secondary' : user.tier === 'regular' ? 'info' : 'default'}
															sx={{ fontWeight: 800, height: 20, fontSize: 10 }}
														/>
													</TableCell>
													<TableCell align="right">
														<Typography sx={{ fontWeight: 800 }}>{user.totalPoints}</Typography>
													</TableCell>
													<TableCell align="right">
														<Typography sx={{ fontWeight: 700 }}>{user.completedOrders}</Typography>
													</TableCell>
												</TableRow>
											))}
										</TableBody>
									</Table>
								</TableContainer>

								{data?.pagination && data.pagination.totalPages > 1 && (
									<Box sx={{ mt: 2 }}>
										<PremiumPagination
											page={page}
											count={data.pagination.totalPages}
											onChange={(_, value) => setPage(value)}
											totalItems={data.pagination.total}
											rowsPerPage={data.pagination.limit}
											loading={loading}
										/>
									</Box>
								)}
							</Paper>
						</Grid>

						<Grid size={{ xs: 12, lg: 4 }}>
							<Paper elevation={0} sx={{ p: 3, borderRadius: 4, border: "1px solid", borderColor: "divider" }}>
								<Typography variant="h6" sx={{ fontWeight: 800, mb: 2 }}>Recent Redemptions</Typography>
								<Stack spacing={2}>
									{data?.recentRedemptions?.length === 0 ? (
										<Typography color="text.secondary" align="center" sx={{ py: 4 }}>No redemptions yet</Typography>
									) : (
										data?.recentRedemptions?.map((redeem: Redemption) => (
											<Box key={redeem.id}>
												<Stack direction="row" justifyContent="space-between" mb={0.5}>
													<Typography sx={{ fontWeight: 800, fontSize: 13 }}>{redeem.username}</Typography>
													<Typography color="secondary.main" sx={{ fontWeight: 900, fontSize: 13 }}>-{redeem.points} PTS</Typography>
												</Stack>
												<Typography variant="caption" color="text.secondary" sx={{ display: "block" }}>{redeem.description}</Typography>
												<Typography variant="caption" sx={{ fontSize: 9, opacity: 0.7 }}>{new Date(redeem.createdAt).toLocaleString()}</Typography>
												<Divider sx={{ mt: 1.5 }} />
											</Box>
										))
									)}
								</Stack>
							</Paper>
						</Grid>
					</Grid>
				</Box>
				<Footer />
			</Box>
		</Box>
	);
}
