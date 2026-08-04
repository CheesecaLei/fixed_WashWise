import { NextRequest, NextResponse } from 'next/server';
import { ObjectId } from 'mongodb';
import { getDb } from '../../../../config/mongodb';
import { pusherServer } from '../../../../lib/pusher';

// GET - Fetch messages for a specific ticket
export async function GET(request: NextRequest) {
    try {
        const { searchParams } = new URL(request.url);
        const ticketId = searchParams.get('ticketId');

        if (!ticketId) {
            return NextResponse.json({ error: 'Ticket ID is required.' }, { status: 400 });
        }

        const db = await getDb();
        const messagesCollection = db.collection('support_messages');

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
        const { ticketId, sender, senderName, senderId, message } = await request.json();

        if (!ticketId || !sender || !message) {
            return NextResponse.json({ error: 'Required fields missing.' }, { status: 400 });
        }

        const db = await getDb();
        const messagesCollection = db.collection('support_messages');
        const ticketsCollection = db.collection('support_tickets');

        const now = new Date().toISOString();

        // Insert message
        const result = await messagesCollection.insertOne({
            ticketId,
            sender,
            senderName: senderName || (sender === 'admin' ? 'Admin' : 'User'),
            senderId: senderId || '',
            message,
            timestamp: now,
            read: sender === 'admin' // Admin messages are auto-marked as read
        });

        // Auto-update ticket status when admin sends first reply to an "open" ticket
        if (sender === 'admin') {
			const { recordActivity } = await import("../../../../lib/logger");
			await recordActivity({
				type: "support-ticket-replied",
				performedBy: "Admin",
				details: `Replied to a support ticket.`
			});

            const ticket = await ticketsCollection.findOne({ _id: new ObjectId(ticketId) });
            
            if (ticket && ticket.status === 'open') {
                // Check if this is the first admin message
                const previousAdminMessages = await messagesCollection.countDocuments({
                    ticketId,
                    sender: 'admin',
                    _id: { $ne: result.insertedId }
                });
                
                if (previousAdminMessages === 0) {
                    // This is the first admin reply, auto-update to in-progress
                    await ticketsCollection.updateOne(
                        { _id: new ObjectId(ticketId) },
                        { $set: { status: 'in-progress', updatedAt: now } }
                    );
                } else {
                    // Just update the timestamp
                    await ticketsCollection.updateOne(
                        { _id: new ObjectId(ticketId) },
                        { $set: { updatedAt: now } }
                    );
                }
            } else {
                // Just update the timestamp
                await ticketsCollection.updateOne(
                    { _id: new ObjectId(ticketId) },
                    { $set: { updatedAt: now } }
                );
            }
        } else {
            // User message, just update timestamp
            await ticketsCollection.updateOne(
                { _id: new ObjectId(ticketId) },
                { $set: { updatedAt: now } }
            );
        }

        const newMessage = {
            id: result.insertedId.toString(),
            ticketId,
            sender,
            senderName: senderName || (sender === 'admin' ? 'Admin' : 'User'),
            senderId: senderId || '',
            message,
            timestamp: now,
            read: sender === 'admin'
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
            // Continue even if Pusher fails
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
        const { ticketId, sender } = await request.json();

        if (!ticketId) {
            return NextResponse.json({ error: 'Ticket ID is required.' }, { status: 400 });
        }

        const db = await getDb();
        const messagesCollection = db.collection('support_messages');

        // Mark all messages from the specified sender as read
        const filter: any = { ticketId, read: false };
        if (sender) {
            filter.sender = sender;
        }

        await messagesCollection.updateMany(
            filter,
            { $set: { read: true } }
        );

        return NextResponse.json({ message: 'Messages marked as read.' }, { status: 200 });
    } catch (error) {
        console.error('Error marking messages as read:', error);
        return NextResponse.json({ error: 'Internal server error.' }, { status: 500 });
    }
}
