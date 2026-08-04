import { NextRequest, NextResponse } from 'next/server';
import { ObjectId } from 'mongodb';
import bcrypt from 'bcrypt';
import { getDb } from '../../../../config/mongodb';

export async function POST(request: NextRequest) {
    try {
        const { userId, newPassword } = await request.json();

        if (!userId || !newPassword) {
            return NextResponse.json({ error: 'User ID and new password are required.' }, { status: 400 });
        }

        const db = await getDb();
        const usersCollection = db.collection('users');

        const hashedPassword = await bcrypt.hash(newPassword, 10);
        
        const result = await usersCollection.updateOne(
            { _id: new ObjectId(userId) },
            { $set: { password: hashedPassword } }
        );

        if (result.matchedCount === 0) {
            return NextResponse.json({ error: 'User not found.' }, { status: 404 });
        }

        return NextResponse.json({
            message: 'Password reset successfully. You can now log in.'
        }, { status: 200 });

    } catch (error) {
        console.error('Error resetting password:', error);
        return NextResponse.json({ error: 'Internal server error.' }, { status: 500 });
    }
}
