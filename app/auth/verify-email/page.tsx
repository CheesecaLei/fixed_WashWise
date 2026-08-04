"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useEffect, useState, Suspense } from "react";
import {
	Alert,
	Box,
	Button,
	CircularProgress,
	Stack,
	Typography,
} from "@mui/material";
import { CheckCircle2, AlertCircle, MailCheck } from "lucide-react";
import AuthLayoutWrapper from "../components/AuthLayoutWrapper";

type VerifyState = "pending" | "loading" | "success" | "error" | "expired" | "already";

function VerifyEmailContent() {
	const router = useRouter();
	const searchParams = useSearchParams();
	const token = searchParams.get("token");
	const emailParam = searchParams.get("email") ?? "";

	const [state, setState] = useState<VerifyState>(token ? "loading" : "pending");
	const [errorMessage, setErrorMessage] = useState("");
	const [resendEmail, setResendEmail] = useState(emailParam);
	const [resendStatus, setResendStatus] = useState<"idle" | "sending" | "sent" | "error">("idle");
	const [resendCooldown, setResendCooldown] = useState(0);

	// Auto-verify when token is in URL
	useEffect(() => {
		if (!token) return;

		async function verify() {
			setState("loading");
			try {
				const res = await fetch(`/api/auth/verify-email?token=${token}`);
				const data = await res.json();

				if (res.ok) {
					if (data.alreadyVerified) {
						setState("already");
					} else {
						setState("success");
						// Redirect to login after 3s
						setTimeout(() => router.replace("/auth/login?verified=1"), 3000);
					}
				} else {
					if (data.expired) {
						setState("expired");
					} else {
						setState("error");
						setErrorMessage(data.error || "Verification failed.");
					}
				}
			} catch {
				setState("error");
				setErrorMessage("Network error. Please try again.");
			}
		}

		verify();
	// eslint-disable-next-line react-hooks/exhaustive-deps
	}, [token]);

	// Cooldown timer for resend
	useEffect(() => {
		if (resendCooldown <= 0) return;
		const timer = setTimeout(() => setResendCooldown((c) => c - 1), 1000);
		return () => clearTimeout(timer);
	}, [resendCooldown]);

	async function handleResend() {
		if (!resendEmail) return;
		setResendStatus("sending");
		try {
			const res = await fetch("/api/auth/resend-verification", {
				method: "POST",
				headers: { "Content-Type": "application/json" },
				body: JSON.stringify({ email: resendEmail }),
			});
			if (res.ok) {
				setResendStatus("sent");
				setResendCooldown(60);
			} else if (res.status === 429) {
				setResendStatus("error");
				setResendCooldown(60);
			} else {
				setResendStatus("error");
			}
		} catch {
			setResendStatus("error");
		}
	}

	// --- Pending state (no token in URL) ---
	if (state === "pending") {
		return (
			<Stack spacing={3} alignItems="center" sx={{ py: 2 }}>
				<Box sx={{
					width: 72, height: 72, borderRadius: "50%",
					background: "linear-gradient(135deg, #11998e22, #38ef7d22)",
					display: "flex", alignItems: "center", justifyContent: "center",
				}}>
					<MailCheck size={38} style={{ color: "#11998e" }} />
				</Box>

				<Stack spacing={1} alignItems="center">
					<Typography variant="h5" fontWeight={800} textAlign="center">
						Check your inbox
					</Typography>
					<Typography variant="body2" color="text.secondary" textAlign="center" maxWidth={340}>
						We sent a verification link to{" "}
						<strong>{emailParam || "your email address"}</strong>. Click the link to activate your account.
					</Typography>
				</Stack>

				<Alert severity="info" sx={{ width: "100%", borderRadius: 2, fontSize: 13 }}>
					Didn&apos;t receive it? Check your spam folder, or resend below.
				</Alert>

				<Stack spacing={1.5} width="100%">
					{resendStatus === "sent" && (
						<Alert severity="success" sx={{ borderRadius: 2 }}>
							A new verification link has been sent!
						</Alert>
					)}
					{resendStatus === "error" && (
						<Alert severity="error" sx={{ borderRadius: 2 }}>
							{resendCooldown > 0
								? `Please wait ${resendCooldown}s before resending.`
								: "Failed to resend. Please try again."}
						</Alert>
					)}

					{!emailParam && (
						<Box
							component="input"
							placeholder="Enter your email to resend"
							value={resendEmail}
							onChange={(e) => setResendEmail(e.target.value)}
							sx={{
								width: "100%", p: "10px 14px", borderRadius: 2,
								border: "1.5px solid", borderColor: "divider",
								fontSize: 14, outline: "none", boxSizing: "border-box",
								"&:focus": { borderColor: "primary.main" },
							}}
						/>
					)}

					<Button
						variant="contained"
						fullWidth
						onClick={handleResend}
						disabled={resendStatus === "sending" || resendCooldown > 0 || !resendEmail}
					>
						{resendStatus === "sending"
							? "Sending…"
							: resendCooldown > 0
							? `Resend in ${resendCooldown}s`
							: "Resend Verification Email"}
					</Button>

					<Button variant="text" fullWidth component={Link} href="/auth/login" sx={{ color: "text.secondary" }}>
						Back to Login
					</Button>
				</Stack>
			</Stack>
		);
	}

	// --- Loading state (verifying token) ---
	if (state === "loading") {
		return (
			<Stack spacing={2} alignItems="center" sx={{ py: 4 }}>
				<CircularProgress size={48} />
				<Typography variant="body1" color="text.secondary">
					Verifying your email…
				</Typography>
			</Stack>
		);
	}

	// --- Success state ---
	if (state === "success" || state === "already") {
		return (
			<Stack spacing={3} alignItems="center" sx={{ py: 2 }}>
				<Box sx={{
					width: 72, height: 72, borderRadius: "50%",
					background: "linear-gradient(135deg, #11998e22, #38ef7d22)",
					display: "flex", alignItems: "center", justifyContent: "center",
				}}>
					<CheckCircle2 size={42} style={{ color: "#10b981" }} />
				</Box>
				<Stack spacing={1} alignItems="center">
					<Typography variant="h5" fontWeight={800} textAlign="center">
						{state === "already" ? "Already verified!" : "Email verified!"}
					</Typography>
					<Typography variant="body2" color="text.secondary" textAlign="center">
						{state === "already"
							? "Your account is already verified. You can log in."
							: "Your account is now active. Redirecting you to login…"}
					</Typography>
				</Stack>
				<Button variant="contained" fullWidth component={Link} href="/auth/login">
					Go to Login
				</Button>
			</Stack>
		);
	}

	// --- Expired state ---
	if (state === "expired") {
		return (
			<Stack spacing={3} alignItems="center" sx={{ py: 2 }}>
				<Box sx={{
					width: 72, height: 72, borderRadius: "50%",
					background: "#fff3e0",
					display: "flex", alignItems: "center", justifyContent: "center",
				}}>
					<AlertCircle size={42} style={{ color: "#f59e0b" }} />
				</Box>
				<Stack spacing={1} alignItems="center">
					<Typography variant="h5" fontWeight={800} textAlign="center">
						Link expired
					</Typography>
					<Typography variant="body2" color="text.secondary" textAlign="center">
						This verification link has expired. Request a new one below.
					</Typography>
				</Stack>

				<Stack spacing={1.5} width="100%">
					{resendStatus === "sent" && (
						<Alert severity="success" sx={{ borderRadius: 2 }}>New link sent! Check your inbox.</Alert>
					)}
					{resendStatus === "error" && (
						<Alert severity="error" sx={{ borderRadius: 2 }}>
							{resendCooldown > 0 ? `Please wait ${resendCooldown}s.` : "Failed to resend."}
						</Alert>
					)}
					<Box
						component="input"
						placeholder="Enter your email to resend"
						value={resendEmail}
						onChange={(e) => setResendEmail(e.target.value)}
						sx={{
							width: "100%", p: "10px 14px", borderRadius: 2,
							border: "1.5px solid", borderColor: "divider",
							fontSize: 14, outline: "none", boxSizing: "border-box",
							"&:focus": { borderColor: "primary.main" },
						}}
					/>
					<Button
						variant="contained"
						fullWidth
						onClick={handleResend}
						disabled={resendStatus === "sending" || resendCooldown > 0 || !resendEmail}
					>
						{resendCooldown > 0 ? `Resend in ${resendCooldown}s` : "Send New Verification Link"}
					</Button>
					<Button variant="text" fullWidth component={Link} href="/auth/login" sx={{ color: "text.secondary" }}>
						Back to Login
					</Button>
				</Stack>
			</Stack>
		);
	}

	// --- Error state ---
	return (
		<Stack spacing={3} alignItems="center" sx={{ py: 2 }}>
			<Box sx={{
				width: 72, height: 72, borderRadius: "50%",
				background: "#fce4ec",
				display: "flex", alignItems: "center", justifyContent: "center",
			}}>
				<AlertCircle size={42} style={{ color: "#ef4444" }} />
			</Box>
			<Stack spacing={1} alignItems="center">
				<Typography variant="h5" fontWeight={800} textAlign="center">
					Verification failed
				</Typography>
				<Typography variant="body2" color="text.secondary" textAlign="center">
					{errorMessage || "This link is invalid or has already been used."}
				</Typography>
			</Stack>
			<Button variant="contained" fullWidth component={Link} href="/auth/login">
				Back to Login
			</Button>
		</Stack>
	);
}

export default function VerifyEmailPage() {
	return (
		<AuthLayoutWrapper maxWidth={480}>
			<Box sx={{ px: { xs: 2, sm: 5 }, py: { xs: 3, sm: 5 } }}>
				<Box sx={{ display: "flex", justifyContent: "center", mb: 3 }}>
					<Box
						component="img"
						src="/WASHWISE_LOGO-removebg-preview.png"
						alt="WashWise Logo"
						sx={{ width: 52, height: 52, objectFit: "contain" }}
					/>
				</Box>
				<Suspense fallback={
					<Stack alignItems="center" py={4}>
						<CircularProgress />
					</Stack>
				}>
					<VerifyEmailContent />
				</Suspense>
			</Box>
		</AuthLayoutWrapper>
	);
}
