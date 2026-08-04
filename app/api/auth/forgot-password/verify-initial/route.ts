import { NextRequest, NextResponse } from 'next/server';
import { getDb } from '../../../../config/mongodb';

export async function POST(request: NextRequest) {
    try {
        const { credential } = await request.json();

        if (!credential) {
            return NextResponse.json({ error: 'Credential is required.' }, { status: 400 });
        }

        const db = await getDb();
        const usersCollection = db.collection('users');

        // Check if it's an email or username
        const isEmail = credential.includes('@');
        let user;

        if (isEmail) {
            user = await usersCollection.findOne({ email: credential });
        } else {
            user = await usersCollection.findOne({ username: credential });
        }

        if (!user) {
            return NextResponse.json({ error: 'User not found.' }, { status: 404 });
        }

        return NextResponse.json({
            userId: user._id.toString(),
            providedType: isEmail ? 'email' : 'username',
            message: 'Identity verified. Please provide secondary credentials.'
        }, { status: 200 });

    } catch (error) {
        console.error('Error verifying initial credential:', error);
        return NextResponse.json({ error: 'Internal server error.' }, { status: 500 });
    }
}
