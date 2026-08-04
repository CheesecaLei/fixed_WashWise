import { NextRequest, NextResponse } from 'next/server';
import { ObjectId } from 'mongodb';
import { getDb } from '../../../config/mongodb';
import { recordActivity } from '../../../lib/logger';

// GET - Fetch all support tickets
export async function GET(request: NextRequest) {
    try {
        const { searchParams } = new URL(request.url);
        const status = searchParams.get('status');
        const priority = searchParams.get('priority');

        const db = await getDb();
        const ticketsCollection = db.collection('support_tickets');
        const messagesCollection = db.collection('support_messages');

        // Build query filter
        const filter: any = {};
        if (status && status !== 'all') {
            filter.status = status;
        }
        if (priority && priority !== 'all') {
            filter.priority = priority;
        }

        // Fetch tickets
        const ticketsRaw = await ticketsCollection
            .find(filter)
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
                sender: 'user',
                read: false
            });

            const lastMessage = messages[0];

            return {
                id: ticket._id.toString(),
                ticketNumber: ticket.ticketNumber,
                userId: ticket.userId,
                userName: ticket.userName,
                userEmail: ticket.userEmail,
                subject: ticket.subject,
                category: ticket.category,
                priority: ticket.priority,
                status: ticket.status,
                createdAt: ticket.createdAt,
                updatedAt: ticket.updatedAt,
                lastMessage: lastMessage?.message || '',
                lastMessageTime: lastMessage?.timestamp || ticket.createdAt,
                unreadCount,
                assignedTo: ticket.assignedTo || '',
                handledBy: ticket.handledBy || 'human',
                escalated: ticket.escalated || false,
                escalationReason: ticket.escalationReason || '',
                escalatedAt: ticket.escalatedAt || ''
            };
        }));

        // Calculate real statistics
        const allTickets = await ticketsCollection.find({}).toArray();
        
        // Calculate average response time
        let totalResponseTime = 0;
        let ticketsWithResponse = 0;
        
        for (const ticket of allTickets) {
            const messages = await messagesCollection
                .find({ ticketId: ticket._id.toString() })
                .sort({ timestamp: 1 })
                .toArray();
            
            // Find first user message and first admin response
            const firstUserMessage = messages.find(m => m.sender === 'user');
            const firstAdminResponse = messages.find(m => m.sender === 'admin');
            
            if (firstUserMessage && firstAdminResponse) {
                const userTime = new Date(firstUserMessage.timestamp).getTime();
                const adminTime = new Date(firstAdminResponse.timestamp).getTime();
                const responseTime = adminTime - userTime;
                
                if (responseTime > 0) {
                    totalResponseTime += responseTime;
                    ticketsWithResponse++;
                }
            }
        }
        
        // Calculate average in hours
        const avgResponseTimeMs = ticketsWithResponse > 0 ? totalResponseTime / ticketsWithResponse : 0;
        const avgResponseTimeHours = avgResponseTimeMs / (1000 * 60 * 60);
        const avgResponseTimeFormatted = avgResponseTimeHours > 0 
            ? `${avgResponseTimeHours.toFixed(1)} hrs`
            : 'N/A';
        
        // Calculate satisfaction rate (resolved + closed tickets / total tickets)
        const resolvedTickets = allTickets.filter(t => t.status === 'resolved' || t.status === 'closed').length;
        const satisfactionRate = allTickets.length > 0 
            ? ((resolvedTickets / allTickets.length) * 100).toFixed(1) + '%'
            : 'N/A';

        const stats = {
            total: allTickets.length,
            open: allTickets.filter(t => t.status === 'open').length,
            inProgress: allTickets.filter(t => t.status === 'in-progress').length,
            resolved: allTickets.filter(t => t.status === 'resolved').length,
            closed: allTickets.filter(t => t.status === 'closed').length,
            avgResponseTime: avgResponseTimeFormatted,
            satisfactionRate: satisfactionRate
        };

        return NextResponse.json({ tickets, stats }, { status: 200 });
    } catch (error) {
        console.error('Error fetching support tickets:', error);
        return NextResponse.json({ error: 'Internal server error.' }, { status: 500 });
    }
}

// POST - Create a new support ticket (for users)
export async function POST(request: NextRequest) {
    try {
        const { userId, userName, userEmail, subject, category, priority, message } = await request.json();

        if (!userId || !subject || !message) {
            return NextResponse.json({ error: 'Required fields missing.' }, { status: 400 });
        }

        const db = await getDb();
        const ticketsCollection = db.collection('support_tickets');
        const messagesCollection = db.collection('support_messages');

        // Generate ticket number
        const ticketCount = await ticketsCollection.countDocuments();
        const ticketNumber = `TKT-${String(ticketCount + 1).padStart(5, '0')}`;

        const now = new Date().toISOString();

        // Create ticket
        const ticketResult = await ticketsCollection.insertOne({
            ticketNumber,
            userId,
            userName: userName || 'User',
            userEmail: userEmail || '',
            subject,
            category: category || 'general',
            priority: priority || 'medium',
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
            senderName: userName || 'User',
            senderId: userId,
            message,
            timestamp: now,
            read: false
        });

        // Record activity
        await recordActivity({
            type: "support-ticket-created",
            customerName: userName || 'User',
            performedBy: "User",
            details: `New support ticket created: ${ticketNumber} - ${subject}`
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

// PATCH - Update ticket status/priority
export async function PATCH(request: NextRequest) {
    try {
        const { ticketId, status, priority, assignedTo } = await request.json();

        if (!ticketId || !ObjectId.isValid(ticketId)) {
            return NextResponse.json({ error: 'Valid Ticket ID is required.' }, { status: 400 });
        }

        const db = await getDb();
        const ticketsCollection = db.collection('support_tickets');

        const updates: any = {
            updatedAt: new Date().toISOString()
        };

        if (status) updates.status = status;
        if (priority) updates.priority = priority;
        if (assignedTo !== undefined) updates.assignedTo = assignedTo;

        const result = await ticketsCollection.updateOne(
            { _id: new ObjectId(ticketId) },
            { $set: updates }
        );

        if (result.matchedCount === 0) {
            return NextResponse.json({ error: 'Ticket not found.' }, { status: 404 });
        }

        // Record activity
        const ticket = await ticketsCollection.findOne({ _id: new ObjectId(ticketId) });
        await recordActivity({
            type: "support-ticket-updated",
            customerName: ticket?.userName || "Unknown",
            performedBy: "Admin",
            details: `Ticket ${ticket?.ticketNumber} updated`
        });

        return NextResponse.json({ message: 'Ticket updated successfully.' }, { status: 200 });
    } catch (error) {
        console.error('Error updating ticket:', error);
        return NextResponse.json({ error: 'Internal server error.' }, { status: 500 });
    }
}
