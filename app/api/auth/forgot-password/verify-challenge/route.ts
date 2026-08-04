import { NextRequest, NextResponse } from 'next/server';
import { ObjectId } from 'mongodb';
import { getDb } from '../../../../config/mongodb';

export async function POST(request: NextRequest) {
    try {
        const { userId, secondaryCredential, address } = await request.json();

        if (!userId || !secondaryCredential || !address) {
            return NextResponse.json({ error: 'All fields are required.' }, { status: 400 });
        }

        const db = await getDb();
        const usersCollection = db.collection('users');

        const user = await usersCollection.findOne({ _id: new ObjectId(userId) });

        if (!user) {
            return NextResponse.json({ error: 'User not found.' }, { status: 404 });
        }

        // Check if secondaryCredential matches either email or username (whichever wasn't used first)
        // AND check if address matches
        const matchesCredential = user.email === secondaryCredential || user.username === secondaryCredential;
        const matchesAddress = user.address?.toLowerCase().includes(address.toLowerCase()) || address.toLowerCase().includes(user.address?.toLowerCase());

        if (!matchesCredential || !matchesAddress) {
            return NextResponse.json({ error: 'Secondary credentials do not match our records.' }, { status: 400 });
        }

        return NextResponse.json({
            message: 'Challenge verified. You can now reset your password.'
        }, { status: 200 });

    } catch (error) {
        console.error('Error verifying challenge:', error);
        return NextResponse.json({ error: 'Internal server error.' }, { status: 500 });
    }
}
