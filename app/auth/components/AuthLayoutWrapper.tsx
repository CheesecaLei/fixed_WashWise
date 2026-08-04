"use client";

import React from "react";
import Link from "next/link";
import { Box, Paper, Stack, Typography, keyframes, ThemeProvider, createTheme, useTheme } from "@mui/material";
import { authFooterBrandText, authFooterLinks } from "../../data/auth";





const float = keyframes`
  0% { transform: translateY(0px) rotate(0deg); }
  50% { transform: translateY(-20px) rotate(5deg); }
  100% { transform: translateY(0px) rotate(0deg); }
`;

const floatReverse = keyframes`
  0% { transform: translateY(0px) rotate(0deg); }
  50% { transform: translateY(20px) rotate(-5deg); }
  100% { transform: translateY(0px) rotate(0deg); }
`;

const bubbleRise = keyframes`
  0% {
    transform: translateY(0px) scale(0.6) translateX(0);
    opacity: 0;
  }
  6% {
    opacity: 0.85;
  }
  50% {
    transform: translateY(-70vh) scale(1) translateX(40px);
    opacity: 0.85;
  }
  94% {
    opacity: 0.85;
  }
  100% {
    transform: translateY(-140vh) scale(1.15) translateX(-25px);
    opacity: 0;
  }
`;

const BUBBLES = [
  // Large & extra-large bubbles distributed across full viewport width & height
  { id: 1, size: 140, left: "3%", duration: 18, delay: -2 },
  { id: 2, size: 75, left: "12%", duration: 14, delay: -8 },
  { id: 3, size: 190, left: "20%", duration: 24, delay: -14 },
  { id: 4, size: 55, left: "29%", duration: 12, delay: -4 },
  { id: 5, size: 120, left: "38%", duration: 20, delay: -16 },
  { id: 6, size: 85, left: "46%", duration: 15, delay: -6 },
  { id: 7, size: 160, left: "55%", duration: 22, delay: -18 },
  { id: 8, size: 65, left: "64%", duration: 13, delay: -3 },
  { id: 9, size: 130, left: "73%", duration: 19, delay: -11 },
  { id: 10, size: 180, left: "82%", duration: 25, delay: -7 },
  { id: 11, size: 90, left: "91%", duration: 16, delay: -15 },
  // Second wave filling mid-spaces
  { id: 12, size: 100, left: "7%", duration: 17, delay: -12 },
  { id: 13, size: 150, left: "16%", duration: 23, delay: -5 },
  { id: 14, size: 45, left: "25%", duration: 11, delay: -17 },
  { id: 15, size: 110, left: "34%", duration: 18, delay: -9 },
  { id: 16, size: 170, left: "48%", duration: 26, delay: -21 },
  { id: 17, size: 60, left: "58%", duration: 13, delay: -10 },
  { id: 18, size: 135, left: "68%", duration: 21, delay: -1 },
  { id: 19, size: 80, left: "77%", duration: 15, delay: -13 },
  { id: 20, size: 145, left: "87%", duration: 22, delay: -20 },
  { id: 21, size: 50, left: "95%", duration: 12, delay: -8 },
  // Giant accent bubbles
  { id: 22, size: 210, left: "2%", duration: 28, delay: -22 },
  { id: 23, size: 125, left: "41%", duration: 19, delay: -3 },
  { id: 24, size: 200, left: "79%", duration: 27, delay: -15 },
];

export default function AuthLayoutWrapper({ children, maxWidth = 520 }: { children: React.ReactNode; maxWidth?: number | { xs: number, sm: number } }) {
	const parentTheme = useTheme();
	
	const mergedTheme = React.useMemo(() => {
		const primaryMain = parentTheme.palette.primary.main;
		const primaryLight = parentTheme.palette.primary.light;
		
		const authThemeOverrides = createTheme({
			components: {
				MuiTextField: {
					styleOverrides: {
						root: {
							"& .MuiOutlinedInput-root": {
								borderRadius: 8,
								transition: "all 0.3s ease",
								background: "rgba(255,255,255,0.6)",
								"&:hover": { boxShadow: "0 4px 12px rgba(0,0,0,0.05)" },
								"&.Mui-focused": { 
									boxShadow: `0 4px 20px ${primaryLight}40`, 
									background: "#fff" 
								}
							}
						}
					}
				},
				MuiButton: {
					styleOverrides: {
						contained: {
							borderRadius: 20,
							fontWeight: 700,
							textTransform: "none",
							fontSize: "1.1rem",
							background: `linear-gradient(45deg, ${primaryMain} 0%, ${primaryLight} 100%)`,
							backgroundSize: "200% auto",
							transition: "all 0.4s ease",
							boxShadow: `0 4px 14px ${primaryMain}40`,
							color: "#ffffff",
							"&:hover": { 
								backgroundPosition: "right center",
								transform: "translateY(-2px)",
								boxShadow: `0 10px 20px ${primaryMain}60` 
							},
							"&:disabled": {
								background: "#e0e0e0",
								color: "#9e9e9e",
								boxShadow: "none",
							}
						}
					}
				}
			}
		});
		
		return createTheme(parentTheme, authThemeOverrides);
	}, [parentTheme]);

	return (
		<ThemeProvider theme={mergedTheme}>
			<Box
			sx={{
				minHeight: "100dvh",
				display: "flex",
				flexDirection: "column",
				position: "relative",
				overflow: "hidden",
				background: "linear-gradient(180deg, #71dfde 0%, #6fa5f4 100%)",
			}}
		>
			{/* Animated Orbs */}
			<Box
				sx={{
					position: "absolute",
					top: "-10%",
					left: "-10%",
					width: "50vw",
					height: "50vw",
					borderRadius: "50%",
					background: "radial-gradient(circle, rgba(142,45,226,0.3) 0%, rgba(255,255,255,0) 70%)",
					filter: "blur(40px)",
					animation: `${float} 10s ease-in-out infinite`,
					zIndex: 0,
				}}
			/>
			<Box
				sx={{
					position: "absolute",
					bottom: "-10%",
					right: "-10%",
					width: "40vw",
					height: "40vw",
					borderRadius: "50%",
					background: "radial-gradient(circle, rgba(56,239,125,0.3) 0%, rgba(255,255,255,0) 70%)",
					filter: "blur(40px)",
					animation: `${floatReverse} 12s ease-in-out infinite`,
					zIndex: 0,
				}}
			/>

			{/* Floating Soap Bubbles - Full Screen & Staggered */}
			{BUBBLES.map((bubble) => (
				<Box
					key={bubble.id}
					sx={{
						position: "absolute",
						bottom: "-220px",
						left: bubble.left,
						width: bubble.size,
						height: bubble.size,
						borderRadius: "50%",
						background:
							"radial-gradient(circle at 32% 32%, rgba(255, 255, 255, 0.85) 0%, rgba(255, 255, 255, 0.3) 35%, rgba(255, 255, 255, 0.08) 65%, rgba(255, 255, 255, 0.4) 100%)",
						border: "1.5px solid rgba(255, 255, 255, 0.65)",
						boxShadow: "inset 0 0 20px rgba(255, 255, 255, 0.55), 0 8px 32px rgba(0, 0, 0, 0.04)",
						backdropFilter: "blur(1px)",
						pointerEvents: "none",
						zIndex: 0,
						animation: `${bubbleRise} ${bubble.duration}s linear infinite`,
						animationDelay: `${bubble.delay}s`,
						"&::after": {
							content: '""',
							position: "absolute",
							top: "16%",
							left: "20%",
							width: "22%",
							height: "22%",
							borderRadius: "50%",
							background: "rgba(255, 255, 255, 0.9)",
							filter: "blur(1px)",
						},
					}}
				/>
			))}

			<Box
				component="main"
				sx={{
					flex: 1,
					px: { xs: 1.5, sm: 3 },
					py: { xs: 2, sm: 5, md: 6 },
					display: "flex",
					alignItems: "center",
					justifyContent: "center",
					position: "relative",
					zIndex: 1,
					width: "100%",
				}}
			>
				<Paper
					elevation={0}
					sx={{
						width: "100%",
						maxWidth: maxWidth,
						borderRadius: { xs: 3, sm: 4 },
						overflow: "hidden",
						background: "rgba(255, 255, 255, 0.88)",
						backdropFilter: "blur(16px)",
						WebkitBackdropFilter: "blur(16px)",
						border: "1px solid rgba(255, 255, 255, 0.5)",
						boxShadow: "0 24px 64px rgba(0, 0, 0, 0.15)",
					}}
				>
					{children}
				</Paper>
			</Box>

			<Box
				component="footer"
				sx={{
					borderTop: "1px solid rgba(255, 255, 255, 0.2)",
					px: { xs: 1.5, sm: 3, md: 4 },
					py: { xs: 1.5, sm: 2 },
					background: "rgba(255, 255, 255, 0.1)",
					backdropFilter: "blur(8px)",
					position: "relative",
					zIndex: 1,
				}}
			>
				<Stack
					direction={{ xs: "column", sm: "row" }}
					alignItems="center"
					justifyContent="space-between"
					spacing={{ xs: 1, sm: 2 }}
				>
					<Typography
						variant="caption"
						sx={{
							color: "rgba(255, 255, 255, 0.9)",
							fontWeight: 500,
							textAlign: { xs: "center", sm: "left" },
							fontSize: { xs: 11, sm: 12 },
						}}
					>
						{authFooterBrandText}
					</Typography>
					<Stack
						direction="row"
						spacing={{ xs: 1.5, sm: 3 }}
						justifyContent="center"
						flexWrap="wrap"
						useFlexGap
					>
						{authFooterLinks.map((link) => (
							<Typography
								key={link.id}
								component={Link}
								href={link.href}
								variant="caption"
								sx={{
									color: "rgba(255, 255, 255, 0.8)",
									textDecoration: "none",
									fontSize: { xs: 11, sm: 12 },
									transition: "color 0.2s ease",
									"&:hover": { color: "rgba(255, 255, 255, 1)" },
								}}
							>
								{link.label}
							</Typography>
						))}
					</Stack>
				</Stack>
			</Box>
		</Box>
		</ThemeProvider>
	);
}
