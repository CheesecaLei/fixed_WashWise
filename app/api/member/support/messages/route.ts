import { NextRequest, NextResponse } from 'next/server';
import { ObjectId } from 'mongodb';
import { getDb } from '../../../../config/mongodb';
import { pusherServer } from '../../../../lib/pusher';

// GET - Fetch messages for a specific ticket
export async function GET(request: NextRequest) {
    try {
        const userId = request.headers.get('x-user-id');
        if (!userId) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const { searchParams } = new URL(request.url);
        const ticketId = searchParams.get('ticketId');

        if (!ticketId) {
            return NextResponse.json({ error: 'Ticket ID is required.' }, { status: 400 });
        }

        const db = await getDb();
        const messagesCollection = db.collection('support_messages');
        const ticketsCollection = db.collection('support_tickets');

        // Verify ticket belongs to user
        const ticket = await ticketsCollection.findOne({ _id: new ObjectId(ticketId) });
        if (!ticket || ticket.userId !== userId) {
            return NextResponse.json({ error: 'Unauthorized access to ticket.' }, { status: 403 });
        }

        const messages = await messagesCollection
            .find({ ticketId })
            .sort({ timestamp: 1 })
            .toArray();

        const formattedMessages = messages.map(msg => ({
            id: msg._id.toString(),
            ticketId: msg.ticketId,
            sender: msg.sender,
            senderName: msg.senderName,
            senderId: msg.senderId,
            message: msg.message,
            timestamp: msg.timestamp,
            read: msg.read
        }));

        return NextResponse.json({ messages: formattedMessages }, { status: 200 });
    } catch (error) {
        console.error('Error fetching messages:', error);
        return NextResponse.json({ error: 'Internal server error.' }, { status: 500 });
    }
}

// POST - Send a new message
export async function POST(request: NextRequest) {
    try {
        const userId = request.headers.get('x-user-id');
        if (!userId) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const { ticketId, message } = await request.json();

        if (!ticketId || !message) {
            return NextResponse.json({ error: 'Required fields missing.' }, { status: 400 });
        }

        const db = await getDb();
        const messagesCollection = db.collection('support_messages');
        const ticketsCollection = db.collection('support_tickets');
        const usersCollection = db.collection('users');

        // Verify ticket belongs to user
        const ticket = await ticketsCollection.findOne({ _id: new ObjectId(ticketId) });
        if (!ticket || ticket.userId !== userId) {
            return NextResponse.json({ error: 'Unauthorized access to ticket.' }, { status: 403 });
        }

        const user = await usersCollection.findOne({ _id: new ObjectId(userId) });
        const now = new Date().toISOString();

        // Insert message
        const result = await messagesCollection.insertOne({
            ticketId,
            sender: 'user',
            senderName: user?.username || 'User',
            senderId: userId,
            message,
            timestamp: now,
            read: false
        });

        // Update ticket's updatedAt
        await ticketsCollection.updateOne(
            { _id: new ObjectId(ticketId) },
            { $set: { updatedAt: now } }
        );

        const newMessage = {
            id: result.insertedId.toString(),
            ticketId,
            sender: 'user',
            senderName: user?.username || 'User',
            senderId: userId,
            message,
            timestamp: now,
            read: false
        };

        // Trigger real-time update via Pusher
        try {
            await pusherServer.trigger(
                `support-ticket-${ticketId}`,
                'new-message',
                newMessage
            );
        } catch (pusherError) {
            console.error('Pusher error:', pusherError);
        }

        return NextResponse.json({ 
            message: 'Message sent successfully.',
            data: newMessage
        }, { status: 201 });
    } catch (error) {
        console.error('Error sending message:', error);
        return NextResponse.json({ error: 'Internal server error.' }, { status: 500 });
    }
}

// PATCH - Mark messages as read
export async function PATCH(request: NextRequest) {
    try {
        const userId = request.headers.get('x-user-id');
        if (!userId) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const { ticketId } = await request.json();

        if (!ticketId) {
            return NextResponse.json({ error: 'Ticket ID is required.' }, { status: 400 });
        }

        const db = await getDb();
        const messagesCollection = db.collection('support_messages');
        const ticketsCollection = db.collection('support_tickets');

        // Verify ticket belongs to user
        const ticket = await ticketsCollection.findOne({ _id: new ObjectId(ticketId) });
        if (!ticket || ticket.userId !== userId) {
            return NextResponse.json({ error: 'Unauthorized access to ticket.' }, { status: 403 });
        }

        // Mark admin messages as read
        await messagesCollection.updateMany(
            { ticketId, sender: 'admin', read: false },
            { $set: { read: true } }
        );

        return NextResponse.json({ message: 'Messages marked as read.' }, { status: 200 });
    } catch (error) {
        console.error('Error marking messages as read:', error);
        return NextResponse.json({ error: 'Internal server error.' }, { status: 500 });
    }
}
