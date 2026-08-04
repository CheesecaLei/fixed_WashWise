import { createHmac, randomUUID } from 'node:crypto';
import bcrypt from 'bcrypt';
import { NextRequest, NextResponse } from 'next/server';
import { ObjectId } from 'mongodb';
import { getDb } from '../../../config/mongodb';
import { stringify } from 'node:querystring';

export const runtime = 'nodejs';

const SESSION_COOKIE_NAME = 'washwise_session';
const SESSION_DURATION_SECONDS = 60 * 60 * 24 * 7;

type LoginRequestBody = {
    email?: unknown;
    password?: unknown;
};

type SessionPayload = {
    sub: string;
    role: string;
    iat: number;
    exp: number;
    jti: string;
};

type UserDocument = {
    _id: any;
    email?: string;
    username?: string;
    password?: string;
    role?: string;
    isVerified?: boolean;
};

function normalizeString(value: unknown): string {
    return typeof value === 'string' ? value.trim() : '';
}

function escapeRegExp(value: string): string {
    return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function createSignedSessionToken(payload: SessionPayload, secret: string): string {
    const encodedPayload = Buffer.from(JSON.stringify(payload)).toString('base64url');
    const signature = createHmac('sha256', secret).update(encodedPayload).digest('base64url');

    return `${encodedPayload}.${signature}`;
}

export async function POST(request: NextRequest) {
    let body: LoginRequestBody;

    try {
        body = (await request.json()) as LoginRequestBody;
    } catch {
        return NextResponse.json({ error: 'Invalid request body.' }, { status: 400 });
    }

    const email = normalizeString(body.email).toLowerCase();
    const password = normalizeString(body.password);

    if (!email || !password) {
        return NextResponse.json({ error: 'Email and password are required.' }, { status: 400 });
    }

    const sessionSecret =
        normalizeString(process.env.AUTH_SESSION_SECRET) ||
        normalizeString(process.env.JWT_SECRET) ||
        normalizeString(process.env.NEXTAUTH_SECRET);

    if (!sessionSecret) {
        console.error('Missing AUTH_SESSION_SECRET, JWT_SECRET, or NEXTAUTH_SECRET.');
        return NextResponse.json({ error: 'Login is temporarily unavailable.' }, { status: 500 });
    }

    try {
        const db = await getDb();
        const usersCollection = db.collection<UserDocument>('users');
        const user = await usersCollection.findOne({
            email: { $regex: `^${escapeRegExp(email)}$`, $options: 'i' },
        });

        if (!user || typeof user.password !== 'string') {
            return NextResponse.json({ error: 'Invalid email or password.' }, { status: 401 });
        }

        const isPasswordValid = await bcrypt.compare(password, user.password);

        if (!isPasswordValid) {
            return NextResponse.json({ error: 'Invalid email or password.' }, { status: 401 });
        }

        // Block login for unverified accounts (strict === false to grandfather existing users)
        if (user.isVerified === false) {
            return NextResponse.json(
                { error: 'Please verify your email before logging in.', unverified: true },
                { status: 403 }
            );
        }

        const userId = String(user._id);
        const role = normalizeString(user.role) || 'member';
        const issuedAt = Math.floor(Date.now() / 1000);
        const expiresAt = issuedAt + SESSION_DURATION_SECONDS;
        const sessionToken = createSignedSessionToken(
            {
                sub: userId,
                role,
                iat: issuedAt,
                exp: expiresAt,
                jti: randomUUID(),
            },
            sessionSecret,
        );

		// Record activity
		const { recordActivity } = await import('../../../lib/logger');
		await recordActivity({
			type: "user-login",
			customerName: typeof user.username === 'string' ? user.username : email,
			performedBy: role === "admin" ? "Admin" : "Customer",
			details: `User logged in successfully.`
		});

        const response = NextResponse.json(
            {
                message: 'Login successful.',
                user: {
                    id: userId,
                    email: typeof user.email === 'string' ? user.email : email,
                    username: typeof user.username === 'string' ? user.username : '',
                    role,
                },
            },
            { status: 200 },
        );

        response.cookies.set(SESSION_COOKIE_NAME, sessionToken, {
            httpOnly: true,
            secure: process.env.NODE_ENV === 'production',
            sameSite: 'lax',
            path: '/',
            maxAge: SESSION_DURATION_SECONDS,
        });

        return response;
    } catch (error) {
        console.error('Error during login:', error);
        return NextResponse.json({ error: 'An error occurred while logging in.' }, { status: 500 });
    }
}