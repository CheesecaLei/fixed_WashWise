"use client";

import {
	Box,
	Typography,
	Paper,
	Grid,
	LinearProgress,
	Stack,
	Avatar,
	Button,
	CircularProgress,
	Alert,
	Stepper,
	Step,
	StepLabel,
	StepConnector,
	stepConnectorClasses,
	styled,
} from "@mui/material";
import {
	Gift,
	Trophy,
	History,
	CheckCircle2,
	Lock,
	Star,
	Sparkles,
	Coins,
} from "lucide-react";
import Sidebar from "../../components/sidebar";
import Footer from "../../components/footer";
import PremiumPagination from "../../components/pagination";
import { useRewards } from "../../hooks/use-rewards";
import { rewardsMilestonesData } from "../../data/rewards";
import { alpha } from "@mui/material/styles";


const ColorlibConnector = styled(StepConnector)(({ theme }) => ({
	[`&.${stepConnectorClasses.alternativeLabel}`]: {
		top: 22,
	},
	[`&.${stepConnectorClasses.active}`]: {
		[`& .${stepConnectorClasses.line}`]: {
			backgroundImage:
				"linear-gradient( 95deg,rgb(242,113,33) 0%,rgb(233,64,87) 50%,rgb(138,35,135) 100%)",
		},
	},
	[`&.${stepConnectorClasses.completed}`]: {
		[`& .${stepConnectorClasses.line}`]: {
			backgroundImage:
				"linear-gradient( 95deg,rgb(242,113,33) 0%,rgb(233,64,87) 50%,rgb(138,35,135) 100%)",
		},
	},
	[`& .${stepConnectorClasses.line}`]: {
		height: 3,
		border: 0,
		backgroundColor: theme.palette.mode === "dark" ? theme.palette.grey[800] : "#eaeaf0",
		borderRadius: 1,
	},
}));

const ColorlibStepIconRoot = styled("div")<{
	active?: boolean;
	completed?: boolean;
}>(({ theme, active, completed }) => ({
	backgroundColor: theme.palette.mode === "dark" ? theme.palette.grey[700] : "#ccc",
	zIndex: 1,
	color: "#fff",
	width: 50,
	height: 50,
	display: "flex",
	borderRadius: "50%",
	justifyContent: "center",
	alignItems: "center",
	...(active && {
		backgroundImage:
			"linear-gradient( 136deg, rgb(242,113,33) 0%, rgb(233,64,87) 50%, rgb(138,35,135) 100%)",
		boxShadow: "0 4px 10px 0 rgba(0,0,0,0.25)",
	}),
	...(completed && {
		backgroundImage:
			"linear-gradient( 136deg, rgb(242,113,33) 0%, rgb(233,64,87) 50%, rgb(138,35,135) 100%)",
	}),
}));

interface ColorlibStepIconProps {
	active?: boolean;
	completed?: boolean;
	className?: string;
	icon: React.ReactNode;
}

function ColorlibStepIcon(props: ColorlibStepIconProps) {
	const { active, completed, className, icon } = props;

	const icons: { [index: string]: React.ReactElement } = {
		1: <Star size={20} />,
		2: <Sparkles size={20} />,
		3: <Trophy size={20} />,
		4: <Gift size={22} />,
	};

	return (
		<ColorlibStepIconRoot active={active} completed={completed} className={className}>
			{icons[String(icon)]}
		</ColorlibStepIconRoot>
	);
}

export default function RewardsPage() {
	const { summary, isLoading, error, page, setPage } = useRewards();

	if (isLoading && !summary) {
		return (
			<Box sx={{ minHeight: "100dvh", display: "flex", bgcolor: "background.default" }}>
				<Sidebar />
				<Box sx={{ flex: 1, display: "flex", justifyContent: "center", alignItems: "center" }}>
					<CircularProgress />
				</Box>
			</Box>
		);
	}

	const activeStep = rewardsMilestonesData.findIndex((m) => m.id === summary?.currentTier);

	return (
		<Box sx={{ minHeight: "100dvh", display: "flex", bgcolor: "background.default" }}>
			<Sidebar />

			{/* minWidth:0 lets wide children scroll internally instead of stretching
			    the page and forcing a horizontal scrollbar. */}
			<Box component="main" sx={{ flex: 1, minWidth: 0, display: "flex", flexDirection: "column" }}>
				<Box sx={{ px: { xs: 1.5, sm: 2, md: 3 }, py: { xs: 2, md: 3 }, flex: 1, overflowY: "auto" }}>
					<Typography variant="h5" sx={{ fontWeight: 800, mb: 1 }}>
						Rewards & Loyalty
					</Typography>
					<Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
						Earn points with every wash and unlock exclusive perks.
					</Typography>

					{error && <Alert severity="error" sx={{ mb: 3 }}>{error}</Alert>}

					{/* Rewards Instructions Guide Banner */}
					<Paper
						elevation={0}
						sx={{
							p: 2.5,
							mb: 3,
							borderRadius: 3,
							border: 1,
							borderColor: "primary.light",
							bgcolor: (theme) => alpha(theme.palette.primary.main, 0.04),
						}}
					>
						<Typography variant="h6" sx={{ fontWeight: 800, fontSize: 16, mb: 0.5, color: "primary.main", display: "flex", alignItems: "center", gap: 1 }}>
							💡 How Rewards & Perks Work — Step-by-Step Guide
						</Typography>
						<Typography variant="body2" color="text.secondary" sx={{ mb: 2, fontSize: 12.5 }}>
							Follow these simple steps to start earning and redeeming discount rewards on all your laundry orders:
						</Typography>

						<Grid container spacing={2}>
							<Grid size={{ xs: 12, md: 4 }}>
								<Stack direction="row" spacing={1.5} alignItems="flex-start">
									<Avatar sx={{ width: 32, height: 32, bgcolor: "primary.main", color: "white", fontWeight: 800, fontSize: 14 }}>1</Avatar>
									<Box>
										<Typography sx={{ fontWeight: 700, fontSize: 13 }}>Place Orders & Earn</Typography>
										<Typography variant="caption" color="text.secondary" sx={{ fontSize: 11, display: "block" }}>
											Earn <strong>1 loyalty point for every ₱10</strong> spent on any laundry service.
										</Typography>
									</Box>
								</Stack>
							</Grid>

							<Grid size={{ xs: 12, md: 4 }}>
								<Stack direction="row" spacing={1.5} alignItems="flex-start">
									<Avatar sx={{ width: 32, height: 32, bgcolor: "info.main", color: "white", fontWeight: 800, fontSize: 14 }}>2</Avatar>
									<Box>
										<Typography sx={{ fontWeight: 700, fontSize: 13 }}>Unlock Tier Perks</Typography>
										<Typography variant="caption" color="text.secondary" sx={{ fontSize: 11, display: "block" }}>
											Reach Bronze (100 pts), Silver (250 pts), Gold (500 pts), & Platinum (1,000 pts).
										</Typography>
									</Box>
								</Stack>
							</Grid>

							<Grid size={{ xs: 12, md: 4 }}>
								<Stack direction="row" spacing={1.5} alignItems="flex-start">
									<Avatar sx={{ width: 32, height: 32, bgcolor: "success.main", color: "white", fontWeight: 800, fontSize: 14 }}>3</Avatar>
									<Box>
										<Typography sx={{ fontWeight: 700, fontSize: 13 }}>Redeem at Checkout</Typography>
										<Typography variant="caption" color="text.secondary" sx={{ fontSize: 11, display: "block" }}>
											Select your unlocked reward discount on the <strong>Checkout Page</strong> for instant savings!
										</Typography>
									</Box>
								</Stack>
							</Grid>
						</Grid>
					</Paper>

					<Grid container spacing={3}>
						{/* Points Hero Card */}
						<Grid size={{ xs: 12, md: 5 }}>
							<Paper
								elevation={0}
								sx={{
									p: 3,
									borderRadius: 4,
									background: (theme) =>
										`linear-gradient(135deg, ${theme.palette.primary.main} 0%, ${theme.palette.primary.dark} 100%)`,
									color: "primary.contrastText",
									position: "relative",
									overflow: "hidden",
								}}
							>
								<Box
									sx={{
										position: "absolute",
										top: -20,
										right: -20,
										opacity: 0.1,
										transform: "rotate(15deg)",
									}}
								>
									<Gift size={160} />
								</Box>

								<Stack spacing={2} sx={{ position: "relative" }}>
									<Box>
										<Typography variant="overline" sx={{ opacity: 0.8, fontWeight: 700 }}>
											Total Balance
										</Typography>
										<Stack direction="row" alignItems="baseline" spacing={1}>
											<Typography variant="h2" sx={{ fontWeight: 900 }}>
												{summary?.totalPoints || 0}
											</Typography>
											<Typography variant="h6" sx={{ opacity: 0.8 }}>
												PTS
											</Typography>
										</Stack>
									</Box>

									<Box>
										<Stack direction="row" justifyContent="space-between" mb={1}>
											<Typography variant="body2" sx={{ fontWeight: 700 }}>
												{summary?.currentTier.toUpperCase()} TIER
											</Typography>
											<Typography variant="body2" sx={{ opacity: 0.8 }}>
												{summary?.completedOrders || 0} Orders Completed
											</Typography>
										</Stack>
										<LinearProgress
											variant="determinate"
											value={summary?.nextTier ? ((summary.completedOrders) / (summary.completedOrders + summary.nextTier.ordersRemaining)) * 100 : 100}
											sx={{
												height: 8,
												borderRadius: 4,
												bgcolor: alpha("#fff", 0.2),
												"& .MuiLinearProgress-bar": { bgcolor: "#fff" },
											}}
										/>
										{summary?.nextTier && (
											<Typography variant="caption" sx={{ mt: 1, display: "block", opacity: 0.9 }}>
												{summary.nextTier.ordersRemaining} more orders to reach {summary.nextTier.tier.toUpperCase()}
											</Typography>
										)}
									</Box>

									<Button
										variant="contained"
										color="inherit"
										sx={{
											color: "primary.main",
											bgcolor: "#fff",
											borderRadius: 2,
											fontWeight: 800,
											"&:hover": { bgcolor: alpha("#fff", 0.9) },
										}}
										onClick={() => {}}
									>
										How to earn more?
									</Button>
								</Stack>
							</Paper>
						</Grid>

						{/* Milestone Progress */}
						<Grid size={{ xs: 12, md: 7 }}>
							<Paper elevation={0} sx={{ p: 3, borderRadius: 4, border: "1px solid", borderColor: "divider", height: "100%" }}>
								<Typography variant="h6" sx={{ fontWeight: 700, mb: 3 }}>
									Your Journey
								</Typography>
								<Stepper alternativeLabel activeStep={activeStep} connector={<ColorlibConnector />}>
									{rewardsMilestonesData.map((label) => (
										<Step key={label.id}>
											<StepLabel StepIconComponent={ColorlibStepIcon}>
												<Typography sx={{ fontWeight: 700, fontSize: 12 }}>{label.label}</Typography>
												<Typography variant="caption" color="text.secondary" sx={{ display: "block", fontSize: 10 }}>
													{label.ordersRequired} ORDERS
												</Typography>
											</StepLabel>
										</Step>
									))}
								</Stepper>

								<Box sx={{ mt: 4 }}>
									<Typography variant="body2" color="text.secondary">
										Tiers are unlocked automatically as you complete more orders. Points earned can be redeemed for rewards at checkout.
									</Typography>
								</Box>
							</Paper>
						</Grid>

						{/* Rewards Grid */}
						<Grid size={12}>
							<Typography variant="h6" sx={{ fontWeight: 700, mt: 2, mb: 2 }}>
								Available Rewards
							</Typography>
							<Grid container spacing={2}>
								{rewardsMilestonesData.map((milestone) => {
									const isUnlocked = summary?.unlockedRewards.includes(milestone.id);
									return (
										<Grid size={{ xs: 12, sm: 6, md: 3 }} key={milestone.id}>
											<Paper
												elevation={0}
												sx={{
													p: 2,
													borderRadius: 3,
													border: "1px solid",
													borderColor: isUnlocked ? milestone.color + ".main" : "divider",
													bgcolor: isUnlocked ? alpha("#fff", 0.02) : alpha("#000", 0.02),
													position: "relative",
													opacity: isUnlocked ? 1 : 0.7,
												}}
											>
												{!isUnlocked && (
													<Box sx={{ position: "absolute", top: 10, right: 10 }}>
														<Lock size={16} color="gray" />
													</Box>
												)}
												<Stack spacing={1.5}>
													<Avatar
														sx={{
															bgcolor: isUnlocked ? alpha(milestone.color === 'secondary' ? '#8a2387' : '#3f51b5', 0.1) : "grey.200",
															color: isUnlocked ? milestone.color + ".main" : "grey.500",
															width: 40,
															height: 40,
														}}
													>
														<Gift size={20} />
													</Avatar>
													<Box>
														<Typography sx={{ fontWeight: 800, fontSize: 14 }}>{milestone.reward}</Typography>
														<Typography variant="caption" color="text.secondary" sx={{ display: "block" }}>
															Costs {milestone.pointsRequired} Points
														</Typography>
													</Box>
													<Button
														size="small"
														variant={isUnlocked ? "contained" : "outlined"}
														disabled={!isUnlocked}
														color={milestone.color as "primary" | "secondary" | "success" | "error" | "info" | "warning" | "inherit"}
														fullWidth
														sx={{ borderRadius: 1.5, fontWeight: 700 }}
													>
														{isUnlocked ? "Unlocked" : "Locked"}
													</Button>
												</Stack>
											</Paper>
										</Grid>
									);
								})}
							</Grid>
						</Grid>

						{/* History */}
						<Grid size={12}>
							<Paper elevation={0} sx={{ p: 3, borderRadius: 4, border: "1px solid", borderColor: "divider" }}>
								<Stack direction="row" alignItems="center" spacing={1} mb={2}>
									<History size={20} />
									<Typography variant="h6" sx={{ fontWeight: 700 }}>
										Points History
									</Typography>
								</Stack>
								<Stack spacing={1}>
									{summary?.history.length === 0 ? (
										<Typography color="text.secondary" sx={{ py: 2, textAlign: "center" }}>
											No points activity yet.
										</Typography>
									) : (
										summary?.history.map((entry) => (
											<Box
												key={entry._id}
												sx={{
													p: 1.5,
													borderRadius: 2,
													display: "flex",
													alignItems: "center",
													justifyContent: "space-between",
													bgcolor: "background.default",
													border: "1px solid transparent",
													"&:hover": { borderColor: "divider" },
												}}
											>
												<Stack direction="row" spacing={2} alignItems="center">
													<Avatar
														sx={{
															width: 36,
															height: 36,
															bgcolor: entry.type === "earn" ? "success.light" : "error.light",
															color: entry.type === "earn" ? "success.contrastText" : "error.contrastText",
														}}
													>
														{entry.type === "earn" ? <CheckCircle2 size={18} /> : <Coins size={18} />}
													</Avatar>
													<Box>
														<Typography sx={{ fontWeight: 700, fontSize: 13 }}>{entry.description}</Typography>
														<Typography variant="caption" color="text.secondary">
															{new Date(entry.createdAt).toLocaleDateString()}
														</Typography>
													</Box>
												</Stack>
												<Typography
													sx={{
														fontWeight: 800,
														color: entry.type === "earn" ? "success.main" : "error.main",
													}}
												>
													{entry.type === "earn" ? "+" : "-"}{entry.points}
												</Typography>
											</Box>
										))
									)}
								</Stack>

								{summary?.pagination && summary.pagination.totalPages > 1 && (
									<Box sx={{ mt: 3 }}>
										<PremiumPagination
											page={page}
											count={summary.pagination.totalPages}
											onChange={(_, value) => setPage(value)}
											totalItems={summary.pagination.total}
											rowsPerPage={summary.pagination.limit}
											loading={isLoading}
										/>
									</Box>
								)}
							</Paper>
						</Grid>
					</Grid>
				</Box>
				<Footer />
			</Box>
		</Box>
	);
}
