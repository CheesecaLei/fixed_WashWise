import { NextRequest, NextResponse } from 'next/server';
import { ObjectId } from 'mongodb';
import { getDb } from '../../../config/mongodb';

// GET - Fetch user's support tickets
export async function GET(request: NextRequest) {
    try {
        const userId = request.headers.get('x-user-id');
        if (!userId || !ObjectId.isValid(userId)) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const db = await getDb();
        const ticketsCollection = db.collection('support_tickets');
        const messagesCollection = db.collection('support_messages');

        // Fetch user's tickets
        const ticketsRaw = await ticketsCollection
            .find({ userId: userId })
            .sort({ updatedAt: -1 })
            .toArray();

        // Enrich with message data
        const tickets = await Promise.all(ticketsRaw.map(async (ticket) => {
            const messages = await messagesCollection
                .find({ ticketId: ticket._id.toString() })
                .sort({ timestamp: -1 })
                .limit(1)
                .toArray();

            const unreadCount = await messagesCollection.countDocuments({
                ticketId: ticket._id.toString(),
                sender: 'admin',
                read: false
            });

            const lastMessage = messages[0];

            return {
                id: ticket._id.toString(),
                ticketNumber: ticket.ticketNumber,
                subject: ticket.subject,
                category: ticket.category,
                priority: ticket.priority,
                status: ticket.status,
                createdAt: ticket.createdAt,
                updatedAt: ticket.updatedAt,
                lastMessage: lastMessage?.message || '',
                lastMessageTime: lastMessage?.timestamp || ticket.createdAt,
                unreadCount,
                handledBy: ticket.handledBy || 'human',
                escalated: ticket.escalated || false
            };
        }));

        return NextResponse.json({ tickets }, { status: 200 });
    } catch (error) {
        console.error('Error fetching support tickets:', error);
        return NextResponse.json({ error: 'Internal server error.' }, { status: 500 });
    }
}

// POST - Create a new support ticket
export async function POST(request: NextRequest) {
    try {
        const userId = request.headers.get('x-user-id');
        if (!userId || !ObjectId.isValid(userId)) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const { subject, category, priority, message } = await request.json();

        if (!subject || !message) {
            return NextResponse.json({ error: 'Subject and message are required.' }, { status: 400 });
        }

        const db = await getDb();
        const ticketsCollection = db.collection('support_tickets');
        const messagesCollection = db.collection('support_messages');
        const usersCollection = db.collection('users');

        // Get user info
        const user = await usersCollection.findOne({ _id: new ObjectId(userId) });

        // Auto-detect priority based on keywords
        const combinedText = `${subject} ${message}`.toLowerCase();
        let autoPriority = priority || 'medium'; // Default to medium
        
        // Urgent keywords
        const urgentKeywords = ['urgent', 'emergency', 'critical', 'asap', 'immediately', 'broken', 'not working', 'cant access', "can't access", 'lost', 'stolen'];
        // High priority keywords
        const highKeywords = ['important', 'soon', 'problem', 'issue', 'error', 'failed', 'wrong', 'missing', 'help'];
        // Low priority keywords
        const lowKeywords = ['question', 'how to', 'wondering', 'curious', 'suggestion', 'feedback', 'feature request'];
        
        if (urgentKeywords.some(keyword => combinedText.includes(keyword))) {
            autoPriority = 'urgent';
        } else if (highKeywords.some(keyword => combinedText.includes(keyword))) {
            autoPriority = 'high';
        } else if (lowKeywords.some(keyword => combinedText.includes(keyword))) {
            autoPriority = 'low';
        }

        // Generate ticket number
        const ticketCount = await ticketsCollection.countDocuments();
        const ticketNumber = `TKT-${String(ticketCount + 1).padStart(5, '0')}`;

        const now = new Date().toISOString();

        // Create ticket
        const ticketResult = await ticketsCollection.insertOne({
            ticketNumber,
            userId: userId,
            userName: user?.username || 'User',
            userEmail: user?.email || '',
            subject,
            category: category || 'general',
            priority: autoPriority,
            status: 'open',
            createdAt: now,
            updatedAt: now,
            assignedTo: ''
        });

        const ticketId = ticketResult.insertedId.toString();

        // Create initial message
        await messagesCollection.insertOne({
            ticketId,
            sender: 'user',
            senderName: user?.username || 'User',
            senderId: userId,
            message,
            timestamp: now,
            read: false
        });

        return NextResponse.json({ 
            message: 'Support ticket created successfully.',
            ticketId,
            ticketNumber
        }, { status: 201 });
    } catch (error) {
        console.error('Error creating support ticket:', error);
        return NextResponse.json({ error: 'Internal server error.' }, { status: 500 });
    }
}

// DELETE - Delete a support ticket and its messages
export async function DELETE(request: NextRequest) {
    try {
        const userId = request.headers.get('x-user-id');
        if (!userId || !ObjectId.isValid(userId)) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const { searchParams } = new URL(request.url);
        const ticketId = searchParams.get('ticketId');

        if (!ticketId || !ObjectId.isValid(ticketId)) {
            return NextResponse.json({ error: 'Invalid ticket ID' }, { status: 400 });
        }

        const db = await getDb();
        const ticketsCollection = db.collection('support_tickets');
        const messagesCollection = db.collection('support_messages');

        // Verify ticket belongs to user
        const ticket = await ticketsCollection.findOne({ 
            _id: new ObjectId(ticketId),
            userId: userId 
        });

        if (!ticket) {
            return NextResponse.json({ error: 'Ticket not found or unauthorized' }, { status: 404 });
        }

        // Delete all messages associated with the ticket
        await messagesCollection.deleteMany({ ticketId: ticketId });

        // Delete the ticket
        await ticketsCollection.deleteOne({ _id: new ObjectId(ticketId) });

        return NextResponse.json({ 
            message: 'Conversation deleted successfully' 
        }, { status: 200 });
    } catch (error) {
        console.error('Error deleting support ticket:', error);
        return NextResponse.json({ error: 'Internal server error.' }, { status: 500 });
    }
}
