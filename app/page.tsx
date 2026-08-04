"use client";

import React from "react";
import Link from "next/link";
import {
	Box,
	Button,
	Container,
	Divider,
	Drawer,
	Grid,
	IconButton,
	Stack,
	Typography,
	AppBar,
	Toolbar,
	useTheme,
	useMediaQuery,
	alpha,
	Paper,
	Chip,
} from "@mui/material";
import {
	ShoppingBag,
	Clock,
	ShieldCheck,
	Truck,
	ChevronRight,
	Star,
	Menu as MenuIcon,
	X,
} from "lucide-react";
import Footer from "./components/footer";

const navLinks = [
	{ title: "Services", href: "#services" },
	{ title: "How it Works", href: "#how-it-works" },
	{ title: "Pricing", href: "#pricing" },
];

const services = [
	{
		title: "Wash & Fold",
		description: "Expert cleaning and precise folding for your everyday essentials.",
		icon: <ShoppingBag size={24} />,
		color: "#0ea5e9",
	},
	{
		title: "Dry Cleaning",
		description: "Specialized care for your delicate fabrics and formal wear.",
		icon: <ShieldCheck size={24} />,
		color: "#8b5cf6",
	},
	{
		title: "Pickup & Delivery",
		description: "Schedule a time, and we'll handle the logistics from your door.",
		icon: <Truck size={24} />,
		color: "#10b981",
	},
	{
		title: "Express Service",
		description: "Need it fast? Get your laundry back in as little as 24 hours.",
		icon: <Clock size={24} />,
		color: "#f59e0b",
	},
];

const steps = [
	{
		title: "Schedule",
		description: "Choose a pickup time that fits your busy schedule.",
		icon: "1",
	},
	{
		title: "We Clean",
		description: "Our experts treat your clothes with the highest care.",
		icon: "2",
	},
	{
		title: "Delivery",
		description: "Fresh, clean clothes delivered back to your doorstep.",
		icon: "3",
	},
];

export default function LandingPage() {
	const theme = useTheme();
	const isMobile = useMediaQuery(theme.breakpoints.down("md"));
	const [menuOpen, setMenuOpen] = React.useState(false);

	React.useEffect(() => {
		if (!isMobile) {
			setMenuOpen(false);
		}
	}, [isMobile]);

	return (
		<Box sx={{ minHeight: "100dvh", display: "flex", flexDirection: "column", bgcolor: "background.default" }}>
			{/* Navbar */}
			<AppBar
				position="sticky"
				elevation={0}
				sx={{
					bgcolor: alpha(theme.palette.background.paper, 0.8),
					backdropFilter: "blur(8px)",
					borderBottom: "1px solid",
					borderColor: "divider",
					color: "text.primary",
				}}
			>
				<Container maxWidth="lg">
					<Toolbar
						disableGutters
						sx={{
							justifyContent: "space-between",
							gap: 1,
							height: { xs: 60, md: 70 },
							minHeight: { xs: 60, md: 70 },
						}}
					>
						<Stack
							component={Link}
							href="/"
							direction="row"
							alignItems="center"
							spacing={1.5}
							sx={{ minWidth: 0, textDecoration: "none", color: "inherit" }}
						>
							<Box
								component="img"
								src="/WASHWISE LOGO.png"
								alt="WashWise Logo"
								sx={{
									width: { xs: 32, md: 38 },
									height: { xs: 32, md: 38 },
									borderRadius: 1.2,
									objectFit: "contain",
									flexShrink: 0,
								}}
							/>
							<Typography
								variant="h6"
								noWrap
								sx={{ fontWeight: 800, letterSpacing: -0.5, fontSize: { xs: 18, md: 20 } }}
							>
								WashWise
							</Typography>
						</Stack>

						{!isMobile && (
							<Stack direction="row" spacing={4}>
								{navLinks.map((link) => (
									<Typography
										key={link.title}
										component={Link}
										href={link.href}
										sx={{
											fontSize: 14,
											fontWeight: 600,
											color: "text.secondary",
											textDecoration: "none",
											transition: "color 0.2s",
											"&:hover": { color: "primary.main" },
										}}
									>
										{link.title}
									</Typography>
								))}
							</Stack>
						)}

						{isMobile ? (
							<IconButton
								onClick={() => setMenuOpen(true)}
								aria-label="Open menu"
								sx={{ flexShrink: 0, color: "text.primary" }}
							>
								<MenuIcon size={22} />
							</IconButton>
						) : (
							<Stack direction="row" spacing={1.5}>
								<Button
									component={Link}
									href="/auth/login"
									variant="text"
									sx={{ fontWeight: 700, fontSize: 14 }}
								>
									Log In
								</Button>
								<Button
									component={Link}
									href="/auth/signup"
									variant="contained"
									sx={{ fontWeight: 700, px: 3, borderRadius: 2, fontSize: 14 }}
								>
									Get Started
								</Button>
							</Stack>
						)}
					</Toolbar>
				</Container>
			</AppBar>

			{/* Mobile menu — the section links are otherwise unreachable below `md`. */}
			<Drawer
				anchor="right"
				open={menuOpen}
				onClose={() => setMenuOpen(false)}
				slotProps={{ paper: { sx: { width: 280, maxWidth: "85vw", p: 2 } } }}
			>
				<Stack direction="row" alignItems="center" justifyContent="space-between" sx={{ mb: 1 }}>
					<Typography variant="h6" sx={{ fontWeight: 800 }}>
						Menu
					</Typography>
					<IconButton onClick={() => setMenuOpen(false)} aria-label="Close menu">
						<X size={20} />
					</IconButton>
				</Stack>

				<Stack spacing={0.5} sx={{ mb: 2 }}>
					{navLinks.map((link) => (
						<Typography
							key={link.title}
							component={Link}
							href={link.href}
							onClick={() => setMenuOpen(false)}
							sx={{
								display: "flex",
								alignItems: "center",
								minHeight: 48,
								px: 1,
								borderRadius: 1.5,
								fontSize: 15,
								fontWeight: 600,
								color: "text.primary",
								textDecoration: "none",
								"&:hover": { bgcolor: "action.hover" },
							}}
						>
							{link.title}
						</Typography>
					))}
				</Stack>

				<Divider sx={{ mb: 2 }} />

				<Stack spacing={1.2}>
					<Button
						component={Link}
						href="/auth/signup"
						variant="contained"
						fullWidth
						onClick={() => setMenuOpen(false)}
						sx={{ fontWeight: 700, borderRadius: 2, minHeight: 46 }}
					>
						Get Started
					</Button>
					<Button
						component={Link}
						href="/auth/login"
						variant="outlined"
						fullWidth
						onClick={() => setMenuOpen(false)}
						sx={{ fontWeight: 700, borderRadius: 2, minHeight: 46 }}
					>
						Log In
					</Button>
				</Stack>
			</Drawer>

			<main>
				{/* Hero Section */}
				<Box sx={{ py: { xs: 5, sm: 7, md: 12 }, position: "relative", overflow: "hidden" }}>
					<Container maxWidth="lg">
						<Grid container spacing={4} alignItems="center">
							<Grid size={{ xs: 12, md: 6 }}>
								<Stack spacing={3}>
									<Box>
										<Chip
											label="Laundry Reimagined"
											color="primary"
											variant="outlined"
											sx={{ fontWeight: 700, mb: 2, borderRadius: 1.5 }}
										/>
										<Typography
											variant="h1"
											sx={{
												fontSize: { xs: "2.25rem", sm: "2.75rem", md: "4rem" },
												fontWeight: 900,
												lineHeight: 1.1,
												letterSpacing: -1,
												mb: 2,
											}}
										>
											Fresh laundry, <br />
											<Box component="span" sx={{ color: "primary.main" }}>
												delivered to your door.
											</Box>
										</Typography>
										<Typography
											variant="h6"
											sx={{ color: "text.secondary", fontWeight: 400, maxWidth: 500, lineHeight: 1.6 }}
										>
											The smartest way to handle your laundry. Schedule a pickup, and we&apos;ll handle the
											rest. High-quality cleaning, fast turnaround, and seamless service.
										</Typography>
									</Box>
									<Stack direction={{ xs: "column", sm: "row" }} spacing={2}>
										<Button
											component={Link}
											href="/auth/signup"
											variant="contained"
											size="large"
											endIcon={<ChevronRight size={20} />}
											sx={{ py: 1.8, px: 4, borderRadius: 2.5, fontWeight: 800, fontSize: 16 }}
										>
											Start Your First Order
										</Button>
										<Button
											variant="outlined"
											size="large"
											sx={{ py: 1.8, px: 4, borderRadius: 2.5, fontWeight: 800, fontSize: 16 }}
										>
											View Pricing
										</Button>
									</Stack>
									<Stack direction="row" alignItems="center" spacing={2}>
										<Stack direction="row" sx={{ ml: 1 }}>
											{[1, 2, 3, 4, 5].map((i) => (
												<Star key={i} size={16} fill="#fbbf24" color="#fbbf24" style={{ marginLeft: -4 }} />
											))}
										</Stack>
										<Typography variant="body2" sx={{ fontWeight: 600, color: "text.secondary" }}>
											Trusted by 2,000+ happy customers in Olongapo
										</Typography>
									</Stack>
								</Stack>
							</Grid>
							<Grid size={{ xs: 12, md: 6 }} sx={{ display: { xs: "none", md: "block" } }}>
								<Box
									sx={{
										position: "relative",
										"&::before": {
											content: '""',
											position: "absolute",
											top: "10%",
											left: "10%",
											right: "-10%",
											bottom: "-10%",
											bgcolor: alpha(theme.palette.primary.main, 0.05),
											borderRadius: 10,
											zIndex: -1,
										},
									}}
								>
									<Paper
										elevation={24}
										sx={{
											borderRadius: 8,
											overflow: "hidden",
											border: "1px solid",
											borderColor: "divider",
										}}
									>
										<Box
											component="img"
											src="https://images.unsplash.com/photo-1545173168-9f1947eebb7f?auto=format&fit=crop&q=80&w=1200"
											sx={{ width: "100%", height: "auto", display: "block" }}
										/>
									</Paper>
								</Box>
							</Grid>
						</Grid>
					</Container>
				</Box>

				{/* Features Section */}
				<Box id="services" sx={{ py: { xs: 6, md: 10 }, bgcolor: alpha(theme.palette.background.paper, 0.5) }}>
					<Container maxWidth="lg">
						<Stack spacing={2} sx={{ textAlign: "center", mb: { xs: 4, md: 8 } }}>
							<Typography variant="h3" sx={{ fontWeight: 900, letterSpacing: -1 }}>
								Our Services
							</Typography>
							<Typography variant="h6" sx={{ color: "text.secondary", maxWidth: 600, mx: "auto" }}>
								We provide top-tier laundry solutions tailored to your specific needs.
							</Typography>
						</Stack>

						<Grid container spacing={{ xs: 2, md: 4 }}>
							{services.map((service) => (
								<Grid size={{ xs: 12, sm: 6, md: 3 }} key={service.title}>
									<Paper
										elevation={0}
										sx={{
											p: { xs: 2.5, md: 4 },
											height: "100%",
											borderRadius: 4,
											border: "1px solid",
											borderColor: "divider",
											transition: "transform 0.3s, border-color 0.3s",
											"&:hover": {
												transform: "translateY(-8px)",
												borderColor: service.color,
											},
										}}
									>
										<Box
											sx={{
												width: 50,
												height: 50,
												borderRadius: 2,
												bgcolor: alpha(service.color, 0.1),
												color: service.color,
												display: "flex",
												alignItems: "center",
												justifyContent: "center",
												mb: 3,
											}}
										>
											{service.icon}
										</Box>
										<Typography variant="h6" sx={{ fontWeight: 800, mb: 1.5 }}>
											{service.title}
										</Typography>
										<Typography variant="body2" sx={{ color: "text.secondary", lineHeight: 1.6 }}>
											{service.description}
										</Typography>
									</Paper>
								</Grid>
							))}
						</Grid>
					</Container>
				</Box>

				{/* How it Works Section */}
				<Box id="how-it-works" sx={{ py: { xs: 7, md: 12 } }}>
					<Container maxWidth="lg">
						<Grid container spacing={{ xs: 4, md: 8 }} alignItems="center">
							<Grid size={{ xs: 12, md: 5 }}>
								<Stack spacing={4}>
									<Box>
										<Typography variant="h3" sx={{ fontWeight: 900, letterSpacing: -1, mb: 2 }}>
											How it Works
										</Typography>
										<Typography variant="body1" sx={{ color: "text.secondary", fontSize: 18 }}>
											Simple, transparent, and completely automated. Spend your time on what matters most.
										</Typography>
									</Box>

									<Stack spacing={4}>
										{steps.map((step) => (
											<Stack key={step.title} direction="row" spacing={3}>
												<Box
													sx={{
														width: 44,
														height: 44,
														minWidth: 44,
														borderRadius: "50%",
														bgcolor: "primary.main",
														color: "white",
														display: "flex",
														alignItems: "center",
														justifyContent: "center",
														fontWeight: 800,
														fontSize: 18,
													}}
												>
													{step.icon}
												</Box>
												<Box>
													<Typography variant="h6" sx={{ fontWeight: 800, mb: 0.5 }}>
														{step.title}
													</Typography>
													<Typography variant="body2" sx={{ color: "text.secondary" }}>
														{step.description}
													</Typography>
												</Box>
											</Stack>
										))}
									</Stack>
								</Stack>
							</Grid>
							<Grid size={{ xs: 12, md: 7 }}>
								<Paper
									elevation={0}
									sx={{
										borderRadius: 6,
										overflow: "hidden",
										border: "1px solid",
										borderColor: "divider",
										bgcolor: "background.paper",
										p: 1,
									}}
								>
									<Box
										component="img"
										src="https://images.unsplash.com/photo-1517677208171-0bc6725a3e60?auto=format&fit=crop&q=80&w=1200"
										sx={{ width: "100%", height: "auto", display: "block", borderRadius: 5 }}
									/>
								</Paper>
							</Grid>
						</Grid>
					</Container>
				</Box>

				{/* Pricing Section Preview */}
				<Box id="pricing" sx={{ py: { xs: 6, md: 10 }, bgcolor: alpha(theme.palette.primary.main, 0.02) }}>
					<Container maxWidth="md">
						<Paper
							elevation={0}
							sx={{
								p: { xs: 3, sm: 4, md: 8 },
								borderRadius: { xs: 4, md: 8 },
								border: "1px solid",
								borderColor: "divider",
								textAlign: "center",
								position: "relative",
								overflow: "hidden",
							}}
						>
							<Box
								sx={{
									position: "absolute",
									top: 0,
									left: 0,
									width: "100%",
									height: 4,
									bgcolor: "primary.main",
								}}
							/>
							<Typography variant="h4" sx={{ fontWeight: 900, mb: 2 }}>
								Simple & Fair Pricing
							</Typography>
							<Typography variant="h6" sx={{ color: "text.secondary", mb: { xs: 3, md: 6 }, fontWeight: 400 }}>
								Only pay for what you wash. No hidden fees.
							</Typography>

							<Grid container spacing={3} sx={{ mb: { xs: 4, md: 6 } }}>
								<Grid size={{ xs: 12, sm: 4 }}>
									<Typography variant="h5" sx={{ fontWeight: 800, color: "primary.main" }}>
										₱35/kg
									</Typography>
									<Typography variant="body2" sx={{ color: "text.secondary" }}>
										Wash & Fold
									</Typography>
								</Grid>
								<Grid size={{ xs: 12, sm: 4 }}>
									<Typography variant="h5" sx={{ fontWeight: 800, color: "primary.main" }}>
										₱45/kg
									</Typography>
									<Typography variant="body2" sx={{ color: "text.secondary" }}>
										Wash, Dry & Press
									</Typography>
								</Grid>
								<Grid size={{ xs: 12, sm: 4 }}>
									<Typography variant="h5" sx={{ fontWeight: 800, color: "primary.main" }}>
										Free
									</Typography>
									<Typography variant="body2" sx={{ color: "text.secondary" }}>
										First Pickup
									</Typography>
								</Grid>
							</Grid>

							<Button
								component={Link}
								href="/auth/signup"
								variant="contained"
								size="large"
								sx={{ py: 2, px: 6, borderRadius: 3, fontWeight: 800 }}
							>
								Ready to start?
							</Button>
						</Paper>
					</Container>
				</Box>

				{/* CTA Section */}
				<Box sx={{ py: { xs: 7, md: 12 } }}>
					<Container maxWidth="lg">
						<Box
							sx={{
								bgcolor: "primary.main",
								borderRadius: { xs: 4, md: 10 },
								p: { xs: 3, sm: 5, md: 10 },
								textAlign: "center",
								color: "white",
								position: "relative",
								overflow: "hidden",
							}}
						>
							<Stack spacing={{ xs: 2.5, md: 4 }} alignItems="center">
								<Typography
									variant="h2"
									sx={{
										fontWeight: 900,
										fontSize: { xs: "1.75rem", sm: "2.25rem", md: "3.5rem" },
										letterSpacing: -1,
										// Let the headline wrap naturally on narrow screens.
										"& br": { display: { xs: "none", sm: "block" } },
									}}
								>
									Ready to say goodbye <br /> to laundry day?
								</Typography>
								<Typography variant="h6" sx={{ opacity: 0.9, fontWeight: 400, maxWidth: 600 }}>
									Join thousands of Olongapo residents who trust WashWise with their laundry.
									Get your first pickup free when you sign up today.
								</Typography>
								<Button
									component={Link}
									href="/auth/signup"
									variant="contained"
									size="large"
									sx={{
										bgcolor: "white",
										color: "primary.main",
										py: { xs: 1.5, md: 2 },
										px: { xs: 4, md: 6 },
										borderRadius: 3,
										fontWeight: 800,
										fontSize: { xs: 16, md: 18 },
										"&:hover": {
											bgcolor: alpha("#fff", 0.9),
										},
									}}
								>
									Sign Up Now
								</Button>
							</Stack>
						</Box>
					</Container>
				</Box>
			</main>

			<Footer />
		</Box>
	);
}
