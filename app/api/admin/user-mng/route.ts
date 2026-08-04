import { NextRequest, NextResponse } from 'next/server';
import { ObjectId } from 'mongodb';
import { getDb } from '../../../config/mongodb';
import { recordActivity } from '../../../lib/logger';

export async function GET(request: NextRequest) {
    try {
        const { searchParams } = new URL(request.url);
        const page = parseInt(searchParams.get("page") || "1");
        const limit = parseInt(searchParams.get("limit") || "10");
        const search = searchParams.get("search") || "";
        const skip = (page - 1) * limit;

        const db = await getDb();
        const usersCollection = db.collection('users');
        const ordersCollection = db.collection('orders');
        const checkoutsCollection = db.collection('checkouts');

        const query: any = { role: { $ne: 'admin' } };
        if (search) {
            query.$or = [
                { username: { $regex: search, $options: "i" } },
                { email: { $regex: search, $options: "i" } },
                { contactNo: { $regex: search, $options: "i" } }
            ];
        }

        // Count total users (non-admin)
        const totalCount = await db.collection('users').countDocuments(query);

        // Fetch paginated users except passwords
        const usersRaw = await usersCollection.find(
            query, 
            { projection: { password: 0 } }
        )
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .toArray();

        // Enriched user data with order counts and total spent
        const users = await Promise.all(usersRaw.map(async (user) => {
            const orderCount = await ordersCollection.countDocuments({ userId: user._id });
            const checkouts = await checkoutsCollection.find({ userId: user._id }).toArray();
            const totalSpent = checkouts.reduce((acc, curr) => acc + (curr.finalTotal || 0), 0);

            return {
                id: user._id.toString(),
                name: user.username || 'User',
                email: user.email || '',
                phone: user.contactNo || 'N/A',
                joinDate: user.createdAt ? new Date(user.createdAt).toLocaleString("en-US", { month: "short", day: "numeric", year: "numeric", hour: "numeric", minute: "2-digit" }) : 'N/A',
                orders: orderCount,
                status: (user.status as string) || 'active',
                totalSpent: `\u20B1${totalSpent.toLocaleString()}`,
            };
        }));

        // Calculate statistics (Need overall counts)
        const [totalActive, totalInactive, totalSuspended] = await Promise.all([
            usersCollection.countDocuments({
                role: { $ne: 'admin' },
                $or: [{ status: 'active' }, { status: { $exists: false } }, { status: null }, { status: '' }]
            }),
            usersCollection.countDocuments({ role: { $ne: 'admin' }, status: 'inactive' }),
            usersCollection.countDocuments({ role: { $ne: 'admin' }, status: 'suspended' })
        ]);

        const stats = {
            total: totalCount,
            active: totalActive,
            inactive: totalInactive,
            suspended: totalSuspended,
        };

        return NextResponse.json({ 
            users, 
            stats,
            pagination: {
                total: totalCount,
                page,
                limit,
                totalPages: Math.ceil(totalCount / limit)
            }
        }, { status: 200 });
    } catch (error) {
        console.error('Error fetching users:', error);
        return NextResponse.json({ error: 'Internal server error.' }, { status: 500 });
    }
}

export async function DELETE(request: NextRequest) {
    try {
        const { userId } = await request.json();
        if (!userId || !ObjectId.isValid(userId)) {
            return NextResponse.json({ error: 'Valid User ID is required.' }, { status: 400 });
        }

        const db = await getDb();
        const usersCollection = db.collection('users');
        
        // Fetch user before deletion for logging
        const user = await usersCollection.findOne({ _id: new ObjectId(userId) });
        
        const result = await usersCollection.deleteOne({ _id: new ObjectId(userId) });
        
        if (result.deletedCount === 0) {
            return NextResponse.json({ error: 'User not found.' }, { status: 404 });
        }

        // Record activity
        await recordActivity({
            type: "user-deleted",
            customerName: user?.username || "Unknown",
            performedBy: "Admin",
            details: `User ${user?.username} (${user?.email}) was deleted.`
        });

        return NextResponse.json({ message: 'User deleted successfully.' }, { status: 200 });
    } catch (error) {
        console.error('Error deleting user:', error);
        return NextResponse.json({ error: 'Internal server error.' }, { status: 500 });
    }
}

export async function PATCH(request: NextRequest) {
    try {
        const { userId, updates } = await request.json();
        if (!userId || !ObjectId.isValid(userId) || !updates) {
            return NextResponse.json({ error: 'Valid User ID and updates are required.' }, { status: 400 });
        }

        const db = await getDb();
        const usersCollection = db.collection('users');
        const result = await usersCollection.updateOne({ _id: new ObjectId(userId) }, { $set: updates });
        
        if (result.matchedCount === 0) {
            return NextResponse.json({ error: 'User not found.' }, { status: 404 });
        }

        // Record activity
        const user = await usersCollection.findOne({ _id: new ObjectId(userId) });
        const updateKeys = Object.keys(updates).join(', ');
        await recordActivity({
            type: "user-updated",
            customerName: user?.username || "Unknown",
            performedBy: "Admin",
            details: `User fields updated: ${updateKeys}`
        });

        return NextResponse.json({ message: 'User updated successfully.' }, { status: 200 });
    } catch (error) {
        console.error('Error updating user:', error);
        return NextResponse.json({ error: 'Internal server error.' }, { status: 500 });
    }
}
