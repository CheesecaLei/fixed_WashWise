import { NextRequest, NextResponse } from 'next/server';
import { getDb } from '../../../config/mongodb';

export const runtime = 'nodejs';

export async function GET(request: NextRequest) {
    const { searchParams } = new URL(request.url);
    const token = searchParams.get('token');

    if (!token) {
        return NextResponse.json({ error: 'Verification token is required.' }, { status: 400 });
    }

    try {
        const db = await getDb();
        const usersCollection = db.collection('users');

        const user = await usersCollection.findOne({ emailVerificationToken: token });

        if (!user) {
            return NextResponse.json({ error: 'Invalid or expired verification link.' }, { status: 400 });
        }

        if (user.isVerified === true) {
            return NextResponse.json({ message: 'Email already verified. You can log in.', alreadyVerified: true }, { status: 200 });
        }

        // Check expiry
        if (user.emailVerificationExpiry && new Date() > new Date(user.emailVerificationExpiry)) {
            return NextResponse.json({ error: 'This verification link has expired. Please request a new one.', expired: true }, { status: 400 });
        }

        // Mark verified and clear token fields
        await usersCollection.updateOne(
            { _id: user._id },
            {
                $set: { isVerified: true },
                $unset: { emailVerificationToken: '', emailVerificationExpiry: '' },
            }
        );

        return NextResponse.json({ message: 'Email verified successfully. You can now log in.' }, { status: 200 });

    } catch (error) {
        console.error('Error during email verification:', error);
        return NextResponse.json({ error: 'Internal server error.' }, { status: 500 });
    }
}
