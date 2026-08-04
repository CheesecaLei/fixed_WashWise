import { NextRequest, NextResponse } from "next/server";

const SESSION_COOKIE_NAME = "washwise_session";

type UserRole = "admin" | "member";

type SessionPayload = {
	sub: string;
	role: string;
	iat: number;
	exp: number;
	jti: string;
};

type AuthSession = {
	userId: string;
	role: UserRole;
	expiresAt: number;
};

function normalizeString(value: unknown): string {
	return typeof value === "string" ? value.trim() : "";
}

function getSessionSecret(): string {
	return (
		normalizeString(process.env.AUTH_SESSION_SECRET) ||
		normalizeString(process.env.JWT_SECRET) ||
		normalizeString(process.env.NEXTAUTH_SECRET)
	);
}

function bytesToBase64Url(bytes: Uint8Array): string {
	let binary = "";

	bytes.forEach((byte) => {
		binary += String.fromCharCode(byte);
	});

	return btoa(binary).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/g, "");
}

function decodeBase64Url(value: string): string | null {
	const normalizedValue = value.replace(/-/g, "+").replace(/_/g, "/");
	const paddedValue = normalizedValue.padEnd(Math.ceil(normalizedValue.length / 4) * 4, "=");

	try {
		return atob(paddedValue);
	} catch {
		return null;
	}
}

function normalizeRole(role: unknown): UserRole | null {
	if (typeof role !== "string") {
		return null;
	}

	if (role === "admin" || role === "member") {
		return role;
	}

	return null;
}

async function computeHmacBase64Url(payloadSegment: string, secret: string): Promise<string> {
	const cryptoKey = await crypto.subtle.importKey(
		"raw",
		new TextEncoder().encode(secret),
		{ name: "HMAC", hash: "SHA-256" },
		false,
		["sign"],
	);

	const signatureBuffer = await crypto.subtle.sign(
		"HMAC",
		cryptoKey,
		new TextEncoder().encode(payloadSegment),
	);

	return bytesToBase64Url(new Uint8Array(signatureBuffer));
}

async function verifySessionToken(token: string, secret: string): Promise<AuthSession | null> {
	const [payloadSegment, signatureSegment, ...extraSegments] = token.split(".");

	if (!payloadSegment || !signatureSegment || extraSegments.length > 0) {
		return null;
	}

	const expectedSignature = await computeHmacBase64Url(payloadSegment, secret);

	if (expectedSignature !== signatureSegment) {
		return null;
	}

	const payloadJson = decodeBase64Url(payloadSegment);

	if (!payloadJson) {
		return null;
	}

	let payload: SessionPayload;

	try {
		payload = JSON.parse(payloadJson) as SessionPayload;
	} catch {
		return null;
	}

	const userId = normalizeString(payload.sub);
	const role = normalizeRole(payload.role);
	const expiresAt = typeof payload.exp === "number" ? payload.exp : 0;

	if (!userId || !role || expiresAt <= Math.floor(Date.now() / 1000)) {
		return null;
	}

	return {
		userId,
		role,
		expiresAt,
	};
}

function getDashboardByRole(role: UserRole) {
	return role === "admin" ? "/admin/dashboard" : "/member/dashboard";
}

function isAuthPage(pathname: string): boolean {
	return pathname === "/auth/login" || pathname === "/auth/signup" || pathname === "/auth/forgotPass";
}

function isAdminPage(pathname: string): boolean {
	return pathname.startsWith("/admin");
}

function isMemberPage(pathname: string): boolean {
	return pathname.startsWith("/member");
}

function isProtectedApi(pathname: string): boolean {
	return pathname.startsWith("/api/admin") || pathname.startsWith("/api/member") || pathname.startsWith("/api/services");
}

function isAdminApi(pathname: string): boolean {
	return pathname.startsWith("/api/admin");
}

function isMemberApi(pathname: string): boolean {
	return pathname.startsWith("/api/member");
}

function unauthorizedApiResponse(message: string, status: number): NextResponse {
	return NextResponse.json({ error: message }, { status });
}

export async function proxy(request: NextRequest) {
	const { pathname } = request.nextUrl;
	const token = request.cookies.get(SESSION_COOKIE_NAME)?.value ?? "";
	const secret = getSessionSecret();
	const session = token && secret ? await verifySessionToken(token, secret) : null;

	if (isProtectedApi(pathname)) {
		if (!session) {
			return unauthorizedApiResponse("Authentication required.", 401);
		}

		if (isAdminApi(pathname) && session.role !== "admin") {
			return unauthorizedApiResponse("Admin role required.", 403);
		}

		if (isMemberApi(pathname) && session.role !== "member") {
			return unauthorizedApiResponse("Member role required.", 403);
		}

		const requestHeaders = new Headers(request.headers);
		requestHeaders.set("x-user-id", session.userId);
		requestHeaders.set("x-user-role", session.role);

		return NextResponse.next({
			request: {
				headers: requestHeaders,
			},
		});
	}

	if (!session) {
		if (isAdminPage(pathname) || isMemberPage(pathname)) {
			const loginUrl = new URL("/auth/login", request.url);
			return NextResponse.redirect(loginUrl);
		}

		return NextResponse.next();
	}

	if (isAuthPage(pathname)) {
		const dashboardUrl = new URL(getDashboardByRole(session.role), request.url);
		return NextResponse.redirect(dashboardUrl);
	}

	if (isAdminPage(pathname) && session.role !== "admin") {
		const dashboardUrl = new URL(getDashboardByRole(session.role), request.url);
		return NextResponse.redirect(dashboardUrl);
	}

	if (isMemberPage(pathname) && session.role !== "member") {
		const dashboardUrl = new URL(getDashboardByRole(session.role), request.url);
		return NextResponse.redirect(dashboardUrl);
	}

	return NextResponse.next();
}

export const config = {
	matcher: ["/admin/:path*", "/member/:path*", "/auth/:path*", "/api/admin/:path*", "/api/member/:path*"],
};