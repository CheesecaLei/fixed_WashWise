"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { FormEvent, Suspense, useState } from "react";
import { ArrowLeft, Eye, EyeOff, Lock, Mail } from "lucide-react";
import { GoogleLogin } from "@react-oauth/google";
import {
	Alert,
	Box,
	Button,
	IconButton,
	InputAdornment,
	Stack,
	TextField,
	Typography,
} from "@mui/material";
import AuthLayoutWrapper from "../components/AuthLayoutWrapper";
import {
	initialLoginFormValues,
	loginPageCopy,
} from "../../data/auth";
import { useLogin } from "../../hooks/use-login";
import type { LoginFormValues } from "../../types/auth";

type LoginFormErrors = Partial<Record<keyof LoginFormValues, string>>;

function validateLoginForm(values: LoginFormValues): LoginFormErrors {
	const errors: LoginFormErrors = {};

	if (!values.email.trim()) {
		errors.email = "Email address is required.";
	} else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(values.email)) {
		errors.email = "Please enter a valid email address.";
	}

	if (!values.password) {
		errors.password = "Password is required.";
	}

	return errors;
}

export default function LoginPage() {
	return (
		<Suspense fallback={null}>
			<LoginPageContent />
		</Suspense>
	);
}

function LoginPageContent() {
	const router = useRouter();
	const searchParams = useSearchParams();
	const justVerified = searchParams.get("verified") === "1";
	const [showPassword, setShowPassword] = useState(false);
	const [formValues, setFormValues] = useState<LoginFormValues>(initialLoginFormValues);
	const [formErrors, setFormErrors] = useState<LoginFormErrors>({});
	const [isUnverified, setIsUnverified] = useState(false);
	const { login, isSubmitting, apiError, clearApiError } = useLogin();

	const handleFieldChange = (field: keyof LoginFormValues, value: string) => {
		setFormValues((previous) => ({
			...previous,
			[field]: value,
		}));

		if (formErrors[field]) {
			setFormErrors((previous) => ({
				...previous,
				[field]: undefined,
			}));
		}

		if (apiError) {
			clearApiError();
		}
		if (isUnverified) setIsUnverified(false);
	};

	const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
		event.preventDefault();

		const validationErrors = validateLoginForm(formValues);

		if (Object.keys(validationErrors).length > 0) {
			setFormErrors(validationErrors);
			return;
		}

		setFormErrors({});
		setIsUnverified(false);

		const result = await login(formValues);

		if (!result.ok) {
			if ((result as any).unverified) setIsUnverified(true);
			return;
		}

		router.replace(result.user.role === "admin" ? "/admin/dashboard" : "/member/dashboard");
	};

	const handleGoogleSuccess = async (credentialResponse: { credential?: string }) => {
		clearApiError();
		try {
			const response = await fetch("/api/auth/google", {
				method: "POST",
				headers: { "Content-Type": "application/json" },
				body: JSON.stringify({ credential: credentialResponse.credential }),
			});

			const data = await response.json();

			if (!response.ok) {
				throw new Error(data.error || "Google authentication failed.");
			}

			router.replace(data.user.role === "admin" ? "/admin/dashboard" : "/member/dashboard");
		} catch (error) {
			console.error("Google login error:", error);
		}
	};

	return (
		<AuthLayoutWrapper>
			<Box sx={{ px: { xs: 2.25, sm: 5, md: 6 }, py: { xs: 3, sm: 4, md: 5 }, display: "flex", flexDirection: "column" }}>
				<Button
					component={Link}
					href="/"
					startIcon={<ArrowLeft size={18} />}
					variant="text"
					size="small"
					sx={{
						mb: 2,
						fontWeight: 700,
						textTransform: "none",
						color: "text.secondary",
						alignSelf: "flex-start",
						"&:hover": {
							color: "primary.main",
							bgcolor: "rgba(17, 153, 142, 0.08)",
						},
					}}
				>
					Back to Home
				</Button>

				<Box sx={{ display: "flex", justifyContent: "center", mb: 1.5 }}>
					<Box
						component="img"
						src="/WASHWISE_LOGO-removebg-preview.png"
						alt="WashWise Logo"
						sx={{
							width: { xs: 52, sm: 60 },
							height: { xs: 52, sm: 60 },
							objectFit: "contain",
							filter: "drop-shadow(0px 4px 10px rgba(0,0,0,0.06))"
						}}
					/>
				</Box>

				<Typography
					variant="h4"
					sx={{
						fontWeight: 800,
						fontSize: { xs: "1.75rem", sm: "2.125rem" },
						textAlign: "center",
						mb: { xs: 2.5, sm: 3.5 },
						background: (theme) => `linear-gradient(90deg, ${theme.palette.primary.main} 0%, ${theme.palette.primary.light} 100%)`,
						WebkitBackgroundClip: "text",
						WebkitTextFillColor: "transparent"
					}}
				>
					{loginPageCopy.title}
				</Typography>

				<Box component="form" onSubmit={handleSubmit} noValidate>
					<Stack spacing={2}>
						<TextField
							fullWidth
							required
							label={loginPageCopy.emailLabel}
							type="email"
							autoComplete="email"
							value={formValues.email}
							onChange={(event) => handleFieldChange("email", event.target.value)}
							error={Boolean(formErrors.email)}
							helperText={formErrors.email}
							InputProps={{
								startAdornment: (
									<InputAdornment position="start">
										<Mail size={20} color="#6b7280" />
									</InputAdornment>
								),
							}}
							sx={{
								"& .MuiOutlinedInput-root": {
									borderRadius: 2,
									transition: "all 0.3s ease",
									background: "rgba(255,255,255,0.6)",
									"&:hover": { boxShadow: "0 4px 12px rgba(0,0,0,0.05)" },
									"&.Mui-focused": { boxShadow: "0 4px 20px rgba(56, 239, 125, 0.2)", background: "#fff" }
								}
							}}
						/>

						<TextField
							fullWidth
							required
							label={loginPageCopy.passwordLabel}
							type={showPassword ? "text" : "password"}
							autoComplete="current-password"
							value={formValues.password}
							onChange={(event) => handleFieldChange("password", event.target.value)}
							error={Boolean(formErrors.password)}
							helperText={formErrors.password}
							InputProps={{
								startAdornment: (
									<InputAdornment position="start">
										<Lock size={20} color="#6b7280" />
									</InputAdornment>
								),
								endAdornment: (
									<InputAdornment position="end">
										<IconButton
											edge="end"
											onClick={() => setShowPassword((previous) => !previous)}
											aria-label="toggle password visibility"
										>
											{showPassword ? <EyeOff size={20} /> : <Eye size={20} />}
										</IconButton>
									</InputAdornment>
								),
							}}
							sx={{
								"& .MuiOutlinedInput-root": {
									borderRadius: 2,
									transition: "all 0.3s ease",
									background: "rgba(255,255,255,0.6)",
									"&:hover": { boxShadow: "0 4px 12px rgba(0,0,0,0.05)" },
									"&.Mui-focused": { boxShadow: "0 4px 20px rgba(56, 239, 125, 0.2)", background: "#fff" }
								}
							}}
						/>

						{justVerified && (
							<Alert severity="success" sx={{ borderRadius: 2 }}>
								✅ Email verified! You can now log in.
							</Alert>
						)}
						{isUnverified ? (
							<Alert severity="warning" sx={{ borderRadius: 2 }}>
								Your email is not verified yet.{" "}
								<Link
									href={`/auth/verify-email?email=${encodeURIComponent(formValues.email)}`}
									style={{ color: "inherit", fontWeight: 700 }}
								>
									Resend verification email →
								</Link>
							</Alert>
						) : (
							apiError && <Alert severity="error" sx={{ borderRadius: 2 }}>{apiError}</Alert>
						)}
					</Stack>

					<Box sx={{ display: "flex", justifyContent: "flex-end", mt: 1 }} component="div">
						<Typography
							component={Link}
							href="/auth/forgotPass"
							variant="caption"
							sx={{ color: "text.secondary", fontWeight: 600, textDecoration: "none", transition: "color 0.2s ease", "&:hover": { color: "#11998e" } }}
						>
							{loginPageCopy.forgotPasswordLabel}
						</Typography>
					</Box>

					<Stack alignItems="center" spacing={2} sx={{ mt: 2.5 }}>
						<Button 
							type="submit" 
							variant="contained" 
							size="large" 
							disabled={isSubmitting}
							sx={{ 
								width: "100%",
								py: 1.4,
								borderRadius: 2.5,
								fontWeight: 700,
								textTransform: "none",
								fontSize: { xs: "1rem", sm: "1.1rem" },
								background: "linear-gradient(45deg, #11998e 0%, #38ef7d 100%)",
								backgroundSize: "200% auto",
								transition: "all 0.4s ease",
								boxShadow: "0 4px 14px rgba(56, 239, 125, 0.3)",
								"&:hover": { 
									backgroundPosition: "right center",
									transform: "translateY(-2px)",
									boxShadow: "0 10px 20px rgba(56, 239, 125, 0.5)" 
								},
								"&:disabled": {
									background: "#e0e0e0",
									color: "#9e9e9e",
									boxShadow: "none",
								}
							}}
						>
							{isSubmitting ? "Logging In..." : loginPageCopy.submitLabel}
						</Button>

						<Typography variant="body2" color="text.secondary" sx={{ fontWeight: 500 }}>
							Or
						</Typography>

						<Box sx={{ width: "100%", maxWidth: 280, display: "flex", justifyContent: "center", mx: "auto", overflow: "hidden" }}>
							<GoogleLogin
								onSuccess={handleGoogleSuccess}
								onError={() => {
									console.error("Google Login Failed");
								}}
								useOneTap
								shape="pill"
								theme="outline"
								text="continue_with"
								width="250"
							/>
						</Box>
					</Stack>
				</Box>
			</Box>

			<Box
				sx={{
					borderTop: 1,
					borderColor: "divider",
					px: 3,
					py: 2.5,
					textAlign: "center",
					background: "rgba(248, 250, 252, 0.3)",
				}}
			>
				<Typography variant="body2" color="text.secondary" component="div">
					{loginPageCopy.noAccountPrompt}{" "}
					<Typography
						component={Link}
						href="/auth/signup"
						variant="body2"
						sx={{ 
							fontWeight: 800, 
							color: "#11998e", 
							textDecoration: "none",
							transition: "color 0.2s",
							"&:hover": { color: "#0d7a71" }
						}}
					>
						{loginPageCopy.signupLabel}
					</Typography>
					.
				</Typography>
			</Box>
		</AuthLayoutWrapper>
	);
}
