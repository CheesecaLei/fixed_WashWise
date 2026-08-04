"use client";

import Link from "next/link";
import dynamic from "next/dynamic";
import { useRouter } from "next/navigation";
import { FormEvent, useMemo, useState } from "react";
import "leaflet/dist/leaflet.css";

const MapAddressPicker = dynamic(() => import("../../components/MapAddressPicker"), {
	ssr: false,
	loading: () => (
		<div style={{ height: 280, display: "flex", alignItems: "center", justifyContent: "center", border: "1px solid #e0e0e0", borderRadius: 8 }}>
			<span style={{ color: "#888", fontSize: 14 }}>Loading map…</span>
		</div>
	),
});
import {
	User,
	Mail,
	Phone,
	Home,
	Building2,
	Lock,
	Eye,
	EyeOff,
	Check,
	X,
	CalendarDays,
} from "lucide-react";
import { GoogleLogin } from "@react-oauth/google";
import {
	Alert,
	alpha,
	Box,
	Button,
	IconButton,
	InputAdornment,
	Stack,
	TextField,
	Typography,
	Checkbox,
	FormControlLabel,
} from "@mui/material";
import AuthLayoutWrapper from "../components/AuthLayoutWrapper";
import {
	buildSignupFormattedAddress,
	initialSignupFormValues,
	signupFieldHints,
	signupFormLabels,
	signupFormRegex,
	signupPageCopy,
	signupReadonlyAddress,
	signupStepFields,
	signupSteps,
	signupValidationMessages,
} from "../../data/auth";
import { useSignup } from "../../hooks/use-signup";
import type { SignupFieldKey, SignupFormErrors, SignupFormValues } from "../../types/auth";

function normalizePhilippineMobile(rawValue: string) {
	const compactValue = rawValue.replace(/\D/g, "");

	if (signupFormRegex.localMobile.test(compactValue)) {
		return compactValue;
	}

	return null;
}

function limitPhilippineMobileInput(rawValue: string) {
	const compactValue = rawValue.replace(/\D/g, "");
	return compactValue.slice(0, 11);
}

function validateSignupForm(values: SignupFormValues, isGoogleSignup: boolean = false) {
	const errors: SignupFormErrors = {};

	if (!values.nameOrUsername.trim()) {
		errors.nameOrUsername = signupValidationMessages.nameOrUsernameRequired;
	}

	if (!values.email.trim()) {
		errors.email = signupValidationMessages.emailRequired;
	} else if (!signupFormRegex.gmail.test(values.email.trim())) {
		errors.email = signupValidationMessages.emailInvalid;
	}

	if (!values.houseOrUnit.trim()) {
		errors.houseOrUnit = signupValidationMessages.houseOrUnitRequired;
	}

	if (!values.street.trim()) {
		errors.street = signupValidationMessages.streetRequired;
	}

	if (!values.barangay.trim()) {
		errors.barangay = signupValidationMessages.barangayRequired;
	}

	if (!values.contactNumber.trim()) {
		errors.contactNumber = signupValidationMessages.contactRequired;
	} else if (!normalizePhilippineMobile(values.contactNumber)) {
		errors.contactNumber = signupValidationMessages.contactInvalid;
	}

	if (!values.dateOfBirth) {
		errors.dateOfBirth = signupValidationMessages.dateOfBirthRequired;
	} else {
		const today = new Date();
		const birthDate = new Date(values.dateOfBirth);
		let age = today.getFullYear() - birthDate.getFullYear();
		const m = today.getMonth() - birthDate.getMonth();
		if (m < 0 || (m === 0 && today.getDate() < birthDate.getDate())) {
			age--;
		}
		if (age < 18) {
			errors.dateOfBirth = signupValidationMessages.dateOfBirthInvalid;
		}
	}

	if (!isGoogleSignup) {
		if (!values.password) {
			errors.password = signupValidationMessages.passwordRequired;
		} else if (values.password.length < 8) {
			errors.password = signupValidationMessages.passwordMinLength;
		}

		if (!values.confirmPassword) {
			errors.confirmPassword = signupValidationMessages.confirmPasswordRequired;
		} else if (values.confirmPassword !== values.password) {
			errors.confirmPassword = signupValidationMessages.confirmPasswordMismatch;
		}
	}

	return errors;
}

function getStepErrors(allErrors: SignupFormErrors, stepIndex: number) {
	const stepErrors: SignupFormErrors = {};

	signupStepFields[stepIndex].forEach((field) => {
		if (allErrors[field]) {
			stepErrors[field] = allErrors[field];
		}
	});

	return stepErrors;
}

function findFirstErrorStep(allErrors: SignupFormErrors) {
	return signupStepFields.findIndex((stepFields) =>
		stepFields.some((field) => Boolean(allErrors[field])),
	);
}

export default function SignupPage() {
	const router = useRouter();
	const [showPassword, setShowPassword] = useState(false);
	const [showConfirmPassword, setShowConfirmPassword] = useState(false);
	const [activeStep, setActiveStep] = useState(0);
	const [formValues, setFormValues] = useState<SignupFormValues>(initialSignupFormValues);
	const [formErrors, setFormErrors] = useState<SignupFormErrors>({});
	const [successMessage, setSuccessMessage] = useState("");
	const [agreeTerms, setAgreeTerms] = useState(false);
	const [agreePrivacy, setAgreePrivacy] = useState(false);
	const [googleAuthData, setGoogleAuthData] = useState<{
		credential: string;
		email: string;
		name: string;
		picture?: string;
	} | null>(null);
	const { signup, isSubmitting, apiError, clearApiError } = useSignup();

	const isLastStep = activeStep === signupSteps.length - 1;

	const formattedAddress = useMemo(
		() => buildSignupFormattedAddress(formValues),
		// eslint-disable-next-line react-hooks/exhaustive-deps
		[formValues.barangay, formValues.houseOrUnit, formValues.street],
	);

	const handleFieldChange = (field: SignupFieldKey, value: string) => {
		const nextValue = field === "contactNumber" ? limitPhilippineMobileInput(value) : value;

		setFormValues((previous) => ({
			...previous,
			[field]: nextValue,
		}));

		if (formErrors[field]) {
			setFormErrors((previous) => ({
				...previous,
				[field]: undefined,
			}));
		}

		if (successMessage) {
			setSuccessMessage("");
		}

		if (apiError) {
			clearApiError();
		}
	};

	const handleNextStep = () => {
		const allErrors = validateSignupForm(formValues, Boolean(googleAuthData));
		const currentStepErrors = getStepErrors(allErrors, activeStep);

		if (Object.keys(currentStepErrors).length > 0) {
			setFormErrors((previous) => ({
				...previous,
				...currentStepErrors,
			}));
			setSuccessMessage("");
			return;
		}

		setActiveStep((previous) => Math.min(previous + 1, signupSteps.length - 1));
		setSuccessMessage("");
	};

	const handleBackStep = () => {
		setActiveStep((previous) => Math.max(previous - 1, 0));
		setSuccessMessage("");
		if (apiError) {
			clearApiError();
		}
	};

	const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
		event.preventDefault();

		const allErrors = validateSignupForm(formValues, Boolean(googleAuthData));

		if (Object.keys(allErrors).length > 0) {
			setFormErrors(allErrors);
			setSuccessMessage("");
			const firstErrorStep = findFirstErrorStep(allErrors);
			if (firstErrorStep >= 0) {
				setActiveStep(firstErrorStep);
			}
			return;
		}

		const normalizedMobile = normalizePhilippineMobile(formValues.contactNumber);
		const submitValues: SignupFormValues = {
			...formValues,
			contactNumber: normalizedMobile ?? formValues.contactNumber,
		};

		setFormErrors({});
		setFormValues((previous) => ({
			...previous,
			contactNumber: submitValues.contactNumber,
		}));

		if (googleAuthData) {
			// Google Signup Flow
			try {
				const response = await fetch("/api/auth/google", {
					method: "POST",
					headers: { "Content-Type": "application/json" },
					body: JSON.stringify({
						credential: googleAuthData.credential,
						address: buildSignupFormattedAddress(submitValues),
						contactNo: submitValues.contactNumber,
					}),
				});

				const data = await response.json();

				if (!response.ok) {
					throw new Error(data.error || "Google registration failed.");
				}

				router.replace(data.user.role === "admin" ? "/admin/dashboard" : "/member/dashboard");
				return;
			} catch (error) {
				console.error("Google registration error:", error);
				// Set API error manually since we're not using the hook for Google auth
				return;
			}
		}

		const result = await signup(submitValues);

		if (result.ok) {
			const encodedEmail = encodeURIComponent(submitValues.email);
			router.replace(`/auth/verify-email?email=${encodedEmail}`);
			return;
		}

		setSuccessMessage("");
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

			if (!data.userExists) {
				// New user - populate form and proceed
				const { email, name, picture, credential } = data.googleProfile;
				setGoogleAuthData({ credential, email, name, picture });
				setFormValues((prev) => ({
					...prev,
					email,
					nameOrUsername: name,
				}));
				// Auto-advance is optional, but let's stay on Step 0 so they can enter contact number
				return;
			}

			router.replace(data.user.role === "admin" ? "/admin/dashboard" : "/member/dashboard");
		} catch (error) {
			console.error("Google signup error:", error);
		}
	};

	const renderStepFields = () => {
		if (activeStep === 0) {
			return (
				<Stack spacing={1.4}>
					<TextField
						fullWidth
						required
						label={signupFormLabels.nameOrUsername}
						size="small"
						value={formValues.nameOrUsername}
						onChange={(event) => handleFieldChange("nameOrUsername", event.target.value)}
						error={Boolean(formErrors.nameOrUsername)}
						helperText={formErrors.nameOrUsername}
						disabled={Boolean(googleAuthData)}
						InputProps={{
							startAdornment: (
								<InputAdornment position="start">
									<User size={18} color="#6b7280" />
								</InputAdornment>
							),
						}}
					/>

					<TextField
						fullWidth
						required
						label={signupFormLabels.email}
						type="email"
						size="small"
						value={formValues.email}
						onChange={(event) => handleFieldChange("email", event.target.value)}
						error={Boolean(formErrors.email)}
						helperText={formErrors.email ?? signupFieldHints.email}
						disabled={Boolean(googleAuthData)}
						InputProps={{
							startAdornment: (
								<InputAdornment position="start">
									<Mail size={18} color="#6b7280" />
								</InputAdornment>
							),
						}}
					/>

					<TextField
						fullWidth
						required
						label={signupFormLabels.contactNumber}
						size="small"
						value={formValues.contactNumber}
						onChange={(event) => handleFieldChange("contactNumber", event.target.value)}
						error={Boolean(formErrors.contactNumber)}
						helperText={formErrors.contactNumber ?? signupFieldHints.contactNumber}
						InputProps={{
							inputProps: {
								maxLength: 11,
								inputMode: "numeric",
							},
							startAdornment: (
								<InputAdornment position="start">
									<Phone size={18} color="#6b7280" />
								</InputAdornment>
							),
						}}
					/>

					<TextField
						fullWidth
						required
						label={signupFormLabels.dateOfBirth}
						type="date"
						size="small"
						value={formValues.dateOfBirth}
						onChange={(event) => handleFieldChange("dateOfBirth", event.target.value)}
						error={Boolean(formErrors.dateOfBirth)}
						helperText={formErrors.dateOfBirth}
						InputLabelProps={{
							shrink: true,
						}}
						InputProps={{
							startAdornment: (
								<InputAdornment position="start">
									<CalendarDays size={18} color="#6b7280" />
								</InputAdornment>
							),
							inputProps: {
								max: new Date().toISOString().split("T")[0],
								onClick: (e: React.MouseEvent<HTMLInputElement>) => {
									try {
										e.currentTarget.showPicker?.();
									} catch {
										// fallback if browser blocks programmatic showPicker
									}
								},
							},
						}}
						sx={{
							"& .MuiInputBase-root": {
								cursor: "pointer",
							},
						}}
					/>

					{!googleAuthData && (
						<Stack alignItems="center" spacing={1} sx={{ pt: 1 }}>
							<Typography variant="caption" color="text.secondary">
								{signupPageCopy.orLabel}
							</Typography>
							<GoogleLogin
								onSuccess={handleGoogleSuccess}
								onError={() => {
									console.error("Google Login Failed");
								}}
								useOneTap
								shape="pill"
								theme="filled_blue"
								text="continue_with"
								width="240"
							/>
						</Stack>
					)}
				</Stack>
			);
		}

		if (activeStep === 1) {
			return (
				<Stack spacing={1.2}>
					<TextField
						fullWidth
						required
						label={signupFormLabels.houseOrUnit}
						size="small"
						value={formValues.houseOrUnit}
						onChange={(event) => handleFieldChange("houseOrUnit", event.target.value)}
						error={Boolean(formErrors.houseOrUnit)}
						helperText={formErrors.houseOrUnit}
						InputProps={{
							startAdornment: (
								<InputAdornment position="start">
									<Home size={18} color="#6b7280" />
								</InputAdornment>
							),
						}}
					/>

					<MapAddressPicker
						street={formValues.street}
						barangay={formValues.barangay}
						onAddressChange={(street, barangay) => {
							handleFieldChange("street", street);
							handleFieldChange("barangay", barangay);
						}}
						streetError={formErrors.street}
						barangayError={formErrors.barangay}
					/>

					<TextField
						fullWidth
						label={signupFormLabels.landmark}
						size="small"
						value={formValues.landmark}
						onChange={(event) => handleFieldChange("landmark", event.target.value)}
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

					{formattedAddress && (
						<Typography variant="caption" sx={{ color: "text.secondary" }}>
							{signupPageCopy.addressPreviewPrefix} {formattedAddress}
						</Typography>
					)}
				</Stack>
			);
		}

		if (googleAuthData) {
			return (
				<Box sx={{ py: 4, textAlign: "center" }}>
					<Typography variant="body1" sx={{ mb: 2 }}>
						You are signing up with <strong>{googleAuthData.email}</strong>.
					</Typography>
					<Typography variant="body2" color="text.secondary">
						No password is required. Click the button below to complete your registration.
					</Typography>
				</Box>
			);
		}

		// Password strength calculation
		const password = formValues.password;
		const checks = [
			{ label: "At least 8 characters", met: password.length >= 8 },
			{ label: "At least one uppercase and lowercase letter", met: /[a-z]/.test(password) && /[A-Z]/.test(password) },
			{ label: "At least one number (0-9)", met: /\d/.test(password) },
			{ label: "At least one special character (e.g. !@#$%)", met: /[^a-zA-Z0-9]/.test(password) }
		];
		const strengthScore = password ? checks.filter((c) => c.met).length : 0;

		const getStrengthLabel = (score: number) => {
			if (!password) return "";
			if (score === 1) return "Weak";
			if (score === 2) return "Fair";
			if (score === 3) return "Good";
			if (score === 4) return "Strong";
			return "Very Weak";
		};

		const getStrengthColor = (score: number) => {
			if (score === 1) return "#ef4444"; // Red
			if (score === 2) return "#f97316"; // Orange
			if (score === 3) return "#3b82f6"; // Blue
			if (score === 4) return "#10b981"; // Emerald Green
			return "#e2e8f0";
		};

		return (
			<Stack spacing={1.4}>
				<TextField
					fullWidth
					required
					label={signupFormLabels.password}
					type={showPassword ? "text" : "password"}
					size="small"
					value={formValues.password}
					onChange={(event) => handleFieldChange("password", event.target.value)}
					error={Boolean(formErrors.password)}
					helperText={formErrors.password}
					InputProps={{
						startAdornment: (
							<InputAdornment position="start">
								<Lock size={18} color="#6b7280" />
							</InputAdornment>
						),
						endAdornment: (
							<InputAdornment position="end">
								<IconButton
									edge="end"
									onClick={() => setShowPassword((previous) => !previous)}
									aria-label="toggle password visibility"
								>
									{showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
								</IconButton>
							</InputAdornment>
						),
					}}
				/>

				{/* Password Strength Checklist and Indicator */}
				<Stack spacing={1} sx={{ mt: 0.5, mb: 1, px: 0.5 }}>
					{password && (
						<Stack direction="row" justifyContent="space-between" alignItems="center">
							<Typography variant="caption" sx={{ color: "text.secondary", fontWeight: 500 }}>
								Password strength:
							</Typography>
							<Typography variant="caption" sx={{ color: getStrengthColor(strengthScore), fontWeight: 700 }}>
								{getStrengthLabel(strengthScore)}
							</Typography>
						</Stack>
					)}

					{/* 4-segment strength bar */}
					<Stack direction="row" spacing={0.6} sx={{ width: "100%", height: 5 }}>
						{[1, 2, 3, 4].map((index) => (
							<Box
								key={index}
								sx={{
									flex: 1,
									height: "100%",
									borderRadius: 1,
									bgcolor: index <= strengthScore ? getStrengthColor(strengthScore) : "action.hover",
									transition: "background-color 0.3s ease",
								}}
							/>
						))}
					</Stack>

					{/* Checklist of rules */}
					<Stack spacing={0.5} sx={{ mt: 1 }}>
						{checks.map((check, idx) => (
							<Stack key={idx} direction="row" alignItems="center" spacing={1}>
								{check.met ? (
									<Check size={15} style={{ color: "#10b981" }} />
								) : (
									<X size={15} style={{ color: "#9ca3af" }} />
								)}
								<Typography
									variant="caption"
									sx={{
										color: check.met ? "success.main" : "text.secondary",
										fontWeight: check.met ? 600 : 400,
										transition: "color 0.2s ease",
									}}
								>
									{check.label}
								</Typography>
							</Stack>
						))}
					</Stack>
				</Stack>

				<TextField
					fullWidth
					required
					label={signupFormLabels.confirmPassword}
					type={showConfirmPassword ? "text" : "password"}
					size="small"
					value={formValues.confirmPassword}
					onChange={(event) => handleFieldChange("confirmPassword", event.target.value)}
					error={Boolean(formErrors.confirmPassword)}
					helperText={formErrors.confirmPassword}
					InputProps={{
						startAdornment: (
							<InputAdornment position="start">
								<Lock size={18} color="#6b7280" />
							</InputAdornment>
						),
						endAdornment: (
							<InputAdornment position="end">
								<IconButton
									edge="end"
									onClick={() => setShowConfirmPassword((previous) => !previous)}
									aria-label="toggle confirm password visibility"
								>
									{showConfirmPassword ? <EyeOff size={18} /> : <Eye size={18} />}
								</IconButton>
							</InputAdornment>
						),
					}}
				/>
			</Stack>
		);
	};

	return (
		<AuthLayoutWrapper maxWidth={720}>
			<Box sx={{ px: { xs: 2, sm: 6 }, py: { xs: 3, sm: 5 } }}>
				<Box sx={{ display: "flex", justifyContent: "center", mb: 2 }}>
					<Box
						component="img"
						src="/WASHWISE_LOGO-removebg-preview.png"
						alt="WashWise Logo"
						sx={{
							width: 60,
							height: 60,
							objectFit: "contain",
							filter: "drop-shadow(0px 4px 10px rgba(0,0,0,0.06))"
						}}
					/>
				</Box>

				<Typography variant="h4" sx={{ fontWeight: 800, textAlign: "center", mb: 0.8, background: (theme) => `linear-gradient(90deg, ${theme.palette.primary.main} 0%, ${theme.palette.primary.light} 100%)`, WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent" }}>
					{signupPageCopy.title}
				</Typography>
				<Typography variant="body1" color="text.secondary" sx={{ textAlign: "center", mb: 4, fontWeight: 500 }}>
					{signupPageCopy.subtitle}
				</Typography>

				<Box component="form" onSubmit={handleSubmit} noValidate>
					<Stack spacing={3}>
						<Stack direction="row" spacing={1.5} justifyContent="center" sx={{ mb: 2, mt: 1 }}>
							{signupSteps.map((step, idx) => (
								<Box
									key={step.id}
									sx={{
										width: activeStep === idx ? 32 : 10,
										height: 6,
										borderRadius: 3,
										bgcolor: (theme) => activeStep === idx ? theme.palette.primary.main : (activeStep > idx ? theme.palette.primary.light : alpha(theme.palette.primary.main, 0.3)),
										transition: "all 0.3s ease"
									}}
								/>
							))}
						</Stack>

						<Box sx={{ mt: 2 }}>
							{renderStepFields()}
						</Box>

						{isLastStep && (
							<Stack spacing={0.5} sx={{ mt: 1, px: 0.5 }}>
								<FormControlLabel
									control={
										<Checkbox
											checked={agreeTerms}
											onChange={(e) => setAgreeTerms(e.target.checked)}
											color="primary"
											size="small"
										/>
									}
									label={
										<Typography variant="body2" sx={{ fontSize: 13, color: "text.secondary" }}>
											I accept the{" "}
											<Link href="/terms" target="_blank" style={{ fontWeight: 700, color: "#11998e", textDecoration: "none" }}>
												Terms of Service
											</Link>
										</Typography>
									}
								/>
								<FormControlLabel
									control={
										<Checkbox
											checked={agreePrivacy}
											onChange={(e) => setAgreePrivacy(e.target.checked)}
											color="primary"
											size="small"
										/>
									}
									label={
										<Typography variant="body2" sx={{ fontSize: 13, color: "text.secondary" }}>
											I agree to the{" "}
											<Link href="/privacy" target="_blank" style={{ fontWeight: 700, color: "#11998e", textDecoration: "none" }}>
												Privacy Policy
											</Link>{" "}
											under the Philippine DPA
										</Typography>
									}
								/>
							</Stack>
						)}

						{apiError && <Alert severity="error" sx={{ borderRadius: 2 }}>{apiError}</Alert>}
						{successMessage && <Alert severity="success" sx={{ borderRadius: 2 }}>{successMessage}</Alert>}

						<Stack direction="row" justifyContent="space-between" alignItems="center" spacing={2} sx={{ pt: 2 }}>
							<Button
								type="button"
								variant="text"
								onClick={handleBackStep}
								disabled={activeStep === 0 || isSubmitting}
								sx={{
									fontWeight: 600,
									color: "primary.main",
									"&:hover": { color: "primary.dark", background: "rgba(0,0,0,0.05)" }
								}}
							>
								{signupPageCopy.backLabel}
							</Button>

							{isLastStep ? (
								<Button type="submit" variant="contained" size="large" sx={{ px: 5 }} disabled={isSubmitting || !agreeTerms || !agreePrivacy}>
									{isSubmitting ? signupPageCopy.submitLoadingLabel : signupPageCopy.submitLabel}
								</Button>
							) : (
								<Button type="button" variant="contained" size="large" sx={{ px: 5 }} onClick={handleNextStep}>
									{signupPageCopy.continueLabel}
								</Button>
							)}
						</Stack>

						{isLastStep && (
							<Typography variant="caption" color="text.secondary" sx={{ mt: 1, textAlign: "center" }}>
								By signing up, you agree to our{' '}
								<Typography
									component={Link}
									href="/terms"
									variant="caption"
									sx={{ fontWeight: 700, textDecoration: 'none', color: '#11998e' }}
								>
									Terms of Service
								</Typography>{' '}
								and acknowledge our{' '}
								<Typography
									component={Link}
									href="/privacy"
									variant="caption"
									sx={{ fontWeight: 700, textDecoration: 'none', color: '#11998e' }}
								>
									Privacy Policy
								</Typography>
								.
							</Typography>
						)}

						{isLastStep && isSubmitting && (
							<Typography variant="caption" sx={{ color: "text.secondary", textAlign: "right" }}>
								{signupPageCopy.submitLoadingStatus}
							</Typography>
						)}

						{isLastStep && !googleAuthData && (
							<Stack alignItems="center" spacing={1.2} sx={{ pt: 1 }}>
								<Box sx={{ width: "100%", display: "flex", justifyContent: "center" }}>
									<GoogleLogin
										onSuccess={handleGoogleSuccess}
										onError={() => {
											console.error("Google Login Failed");
										}}
										useOneTap
										shape="pill"
										theme="outline"
										text="continue_with"
										width="300"
									/>
								</Box>
							</Stack>
						)}
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
					{signupPageCopy.hasAccountPrompt}{" "}
					<Typography
						component={Link}
						href="/auth/login"
						variant="body2"
						sx={{
							fontWeight: 800,
							color: "#11998e",
							textDecoration: "none",
							transition: "color 0.2s",
							"&:hover": { color: "#0d7a71" }
						}}
					>
						{signupPageCopy.loginLabel}
					</Typography>
					.
				</Typography>
			</Box>
		</AuthLayoutWrapper>
	);
}
