import { createHmac, randomUUID } from 'node:crypto';
import { NextRequest, NextResponse } from 'next/server';
import { OAuth2Client } from 'google-auth-library';
import { getDb } from '../../../config/mongodb';

export const runtime = 'nodejs';

const SESSION_COOKIE_NAME = 'washwise_session';
const SESSION_DURATION_SECONDS = 60 * 60 * 24 * 7;

const client = new OAuth2Client(process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID);

function normalizeString(value: unknown): string {
    return typeof value === 'string' ? value.trim() : '';
}

function createSignedSessionToken(payload: any, secret: string): string {
    const encodedPayload = Buffer.from(JSON.stringify(payload)).toString('base64url');
    const signature = createHmac('sha256', secret).update(encodedPayload).digest('base64url');

    return `${encodedPayload}.${signature}`;
}

export async function POST(request: NextRequest) {
    try {
        const { credential, address, contactNo } = await request.json();

        if (!credential) {
            return NextResponse.json({ error: 'Missing Google credential.' }, { status: 400 });
        }

        // Verify the ID token
        const ticket = await client.verifyIdToken({
            idToken: credential,
            audience: process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID,
        });

        const payload = ticket.getPayload();
        if (!payload || !payload.email) {
            return NextResponse.json({ error: 'Invalid Google token.' }, { status: 400 });
        }

        const { email, name, picture, sub: googleId } = payload;

        const db = await getDb();
        const usersCollection = db.collection('users');

        // Check if user exists
        let user = await usersCollection.findOne({ email });

        if (!user) {
            // If address or contactNo are missing, we treat this as a "new user check"
            // and return the user info so the frontend can complete the profile.
            if (!address || !contactNo) {
                return NextResponse.json({
                    success: true,
                    userExists: false,
                    googleProfile: {
                        email,
                        name,
                        picture,
                        credential // Send back the credential to be reused in the final step
                    }
                }, { status: 200 });
            }

            // Create new user for social login
            const newUser = {
                email,
                username: name || email.split('@')[0],
                avatar: picture,
                googleId,
                role: 'member',
                address: address || '',
                contactNo: contactNo || '',
                createdAt: new Date(),
            };
            const result = await usersCollection.insertOne(newUser);
            user = { ...newUser, _id: result.insertedId };
        }

        const sessionSecret =
            normalizeString(process.env.AUTH_SESSION_SECRET) ||
            normalizeString(process.env.JWT_SECRET) ||
            normalizeString(process.env.NEXTAUTH_SECRET);

        if (!sessionSecret) {
            console.error('Missing session secret.');
            return NextResponse.json({ error: 'Login is temporarily unavailable.' }, { status: 500 });
        }

        const userId = String(user._id);
        const role = user.role || 'member';
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

        const response = NextResponse.json(
            {
                success: true,
                userExists: true,
                message: 'Google login successful.',
                user: {
                    id: userId,
                    email,
                    username: user.username,
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
        console.error('Error during Google Auth:', error);
        return NextResponse.json({ error: 'Authentication failed.' }, { status: 500 });
    }
}
