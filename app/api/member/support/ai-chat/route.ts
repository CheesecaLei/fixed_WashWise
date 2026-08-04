import { NextRequest, NextResponse } from 'next/server';
import { ObjectId } from 'mongodb';
import { getDb } from '../../../../config/mongodb';
import { getAIResponse, AIError, AIErrorType } from '../../../../lib/ai-chatbot';
import { pusherServer } from '../../../../lib/pusher';

/**
 * Rate limiting configuration
 * In production, use Redis or a proper rate limiting service
 */
const rateLimitMap = new Map<string, { count: number; resetTime: number }>();
const RATE_LIMIT_WINDOW = 60000; // 1 minute
const RATE_LIMIT_MAX_REQUESTS = 10; // 10 requests per minute

/**
 * Check if user has exceeded rate limit
 */
function checkRateLimit(userId: string): { allowed: boolean; retryAfter?: number } {
    const now = Date.now();
    const userLimit = rateLimitMap.get(userId);
    
    if (!userLimit || now > userLimit.resetTime) {
        // Reset or create new limit
        rateLimitMap.set(userId, {
            count: 1,
            resetTime: now + RATE_LIMIT_WINDOW
        });
        return { allowed: true };
    }
    
    if (userLimit.count >= RATE_LIMIT_MAX_REQUESTS) {
        const retryAfter = Math.ceil((userLimit.resetTime - now) / 1000);
        return { allowed: false, retryAfter };
    }
    
    userLimit.count++;
    return { allowed: true };
}

/**
 * Clean up old rate limit entries (run periodically)
 */
function cleanupRateLimitMap() {
    const now = Date.now();
    for (const [userId, limit] of rateLimitMap.entries()) {
        if (now > limit.resetTime) {
            rateLimitMap.delete(userId);
        }
    }
}

// Clean up every 5 minutes
setInterval(cleanupRateLimitMap, 300000);

/**
 * POST - Send message to AI chatbot
 */
export async function POST(request: NextRequest) {
    const startTime = Date.now();
    
    try {
        // Authentication check
        const userId = request.headers.get('x-user-id');
        if (!userId || !ObjectId.isValid(userId)) {
            console.warn('[AI Chat] Unauthorized access attempt');
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }
        
        // Rate limiting
        const rateLimit = checkRateLimit(userId);
        if (!rateLimit.allowed) {
            console.warn('[AI Chat] Rate limit exceeded:', { userId, retryAfter: rateLimit.retryAfter });
            return NextResponse.json(
                { 
                    error: 'Too many requests. Please try again later.',
                    retryAfter: rateLimit.retryAfter 
                },
                { 
                    status: 429,
                    headers: {
                        'Retry-After': String(rateLimit.retryAfter),
                        'X-RateLimit-Limit': String(RATE_LIMIT_MAX_REQUESTS),
                        'X-RateLimit-Remaining': '0',
                        'X-RateLimit-Reset': String(Math.floor(Date.now() / 1000) + (rateLimit.retryAfter || 0))
                    }
                }
            );
        }

        // Parse and validate request body
        let body;
        try {
            body = await request.json();
        } catch (parseError) {
            console.error('[AI Chat] Invalid JSON in request body');
            return NextResponse.json({ error: 'Invalid request format' }, { status: 400 });
        }
        
        const { ticketId, message } = body;

        // Validate message
        if (!message || typeof message !== 'string' || !message.trim()) {
            return NextResponse.json({ error: 'Message is required and must be a non-empty string.' }, { status: 400 });
        }
        
        // Validate message length
        if (message.length > 2000) {
            return NextResponse.json({ error: 'Message is too long. Maximum 2000 characters.' }, { status: 400 });
        }

        console.log('[AI Chat] Processing request:', {
            userId,
            ticketId: ticketId || 'new',
            messageLength: message.length,
            timestamp: new Date().toISOString()
        });

        const db = await getDb();
        const messagesCollection = db.collection('support_messages');
        const ticketsCollection = db.collection('support_tickets');
        const usersCollection = db.collection('users');

        // Get user info
        const user = await usersCollection.findOne({ _id: new ObjectId(userId) });
        if (!user) {
            console.error('[AI Chat] User not found:', userId);
            return NextResponse.json({ error: 'User not found' }, { status: 404 });
        }
        
        const now = new Date().toISOString();

        // If no ticketId, this is a new conversation - create ticket
        let actualTicketId = ticketId;
        let ticketNumber = '';

        if (!ticketId) {
            // Generate ticket number
            const ticketCount = await ticketsCollection.countDocuments();
            ticketNumber = `TKT-${String(ticketCount + 1).padStart(5, '0')}`;

            // Auto-generate subject from first message
            const subject = message.length > 50 
                ? message.substring(0, 47) + '...' 
                : message;

            // Create ticket with AI bot handling
            const ticketResult = await ticketsCollection.insertOne({
                ticketNumber,
                userId: userId,
                userName: user.username || 'User',
                userEmail: user.email || '',
                subject,
                category: 'general',
                priority: 'low', // AI-handled tickets start as low priority
                status: 'open',
                handledBy: 'ai', // Track that AI is handling this
                escalated: false,
                createdAt: now,
                updatedAt: now,
                assignedTo: ''
            });

            actualTicketId = ticketResult.insertedId.toString();
            
            console.log('[AI Chat] Created new ticket:', {
                ticketId: actualTicketId,
                ticketNumber,
                userId
            });
        } else {
            // Validate ticket exists and belongs to user
            const ticket = await ticketsCollection.findOne({ _id: new ObjectId(ticketId) });
            if (!ticket) {
                return NextResponse.json({ error: 'Ticket not found' }, { status: 404 });
            }
            if (ticket.userId !== userId) {
                console.warn('[AI Chat] Unauthorized ticket access attempt:', { userId, ticketId });
                return NextResponse.json({ error: 'Unauthorized access to ticket' }, { status: 403 });
            }
            ticketNumber = ticket.ticketNumber;
        }

        // Save user message
        const userMessageResult = await messagesCollection.insertOne({
            ticketId: actualTicketId,
            sender: 'user',
            senderName: user.username || 'User',
            senderId: userId,
            message,
            timestamp: now,
            read: false
        });

        const userMessageData = {
            id: userMessageResult.insertedId.toString(),
            ticketId: actualTicketId,
            sender: 'user',
            senderName: user.username || 'User',
            senderId: userId,
            message,
            timestamp: now,
            read: false
        };

        // Trigger real-time update for user message
        try {
            await pusherServer.trigger(
                `support-ticket-${actualTicketId}`,
                'new-message',
                userMessageData
            );
        } catch (pusherError) {
            console.error('[AI Chat] Pusher error (non-critical):', pusherError);
            // Don't fail the request if Pusher fails
        }

        // Get conversation history for context
        const previousMessages = await messagesCollection
            .find({ ticketId: actualTicketId })
            .sort({ timestamp: 1 })
            .limit(20) // Limit to prevent excessive data
            .toArray();

        const conversationHistory = previousMessages
            .filter(msg => msg.sender && msg.message) // Filter out invalid messages
            .map(msg => ({
                role: msg.sender === 'user' ? 'user' as const : 'assistant' as const,
                content: msg.message,
                timestamp: msg.timestamp
            }));

        // Get AI response
        const aiResponse = await getAIResponse(message, conversationHistory);

        const processingTime = Date.now() - startTime;
        
        console.log('[AI Chat] AI Response received:', {
            shouldEscalate: aiResponse.shouldEscalate,
            escalationReason: aiResponse.escalationReason,
            confidence: aiResponse.confidence,
            processingTime: `${processingTime}ms`,
            messagePreview: aiResponse.message.substring(0, 100)
        });

        // Check if escalation is needed
        if (aiResponse.shouldEscalate) {
            // Update ticket to escalated status
            await ticketsCollection.updateOne(
                { _id: new ObjectId(actualTicketId) },
                { 
                    $set: { 
                        handledBy: 'human',
                        escalated: true,
                        escalationReason: aiResponse.escalationReason,
                        escalatedAt: now,
                        priority: 'medium', // Escalated tickets get medium priority
                        updatedAt: now
                    } 
                }
            );

            // Save escalation message from AI
            const escalationMessageResult = await messagesCollection.insertOne({
                ticketId: actualTicketId,
                sender: 'admin',
                senderName: 'WashPal AI',
                senderId: 'ai-bot',
                message: aiResponse.message,
                timestamp: now,
                read: true,
                isAI: true
            });

            const escalationMessageData = {
                id: escalationMessageResult.insertedId.toString(),
                ticketId: actualTicketId,
                sender: 'admin',
                senderName: 'WashPal AI',
                senderId: 'ai-bot',
                message: aiResponse.message,
                timestamp: now,
                read: true,
                isAI: true
            };

            // Trigger real-time updates
            try {
                await pusherServer.trigger(
                    `support-ticket-${actualTicketId}`,
                    'new-message',
                    escalationMessageData
                );

                // Notify admin of escalation
                await pusherServer.trigger(
                    'admin-notifications',
                    'ticket-escalated',
                    {
                        ticketId: actualTicketId,
                        ticketNumber: ticketNumber || 'Unknown',
                        userName: user.username || 'User',
                        reason: aiResponse.escalationReason,
                        timestamp: now
                    }
                );
            } catch (pusherError) {
                console.error('[AI Chat] Pusher error (non-critical):', pusherError);
            }

            console.log('[AI Chat] Ticket escalated:', {
                ticketId: actualTicketId,
                reason: aiResponse.escalationReason,
                processingTime: `${processingTime}ms`
            });

            return NextResponse.json({
                success: true,
                ticketId: actualTicketId,
                ticketNumber,
                message: aiResponse.message,
                escalated: true,
                escalationReason: aiResponse.escalationReason,
                metadata: aiResponse.metadata
            }, { status: 200 });
        }

        // Save AI response
        const aiMessageResult = await messagesCollection.insertOne({
            ticketId: actualTicketId,
            sender: 'admin',
            senderName: 'WashPal AI',
            senderId: 'ai-bot',
            message: aiResponse.message,
            timestamp: new Date().toISOString(),
            read: true,
            isAI: true
        });

        const aiMessageData = {
            id: aiMessageResult.insertedId.toString(),
            ticketId: actualTicketId,
            sender: 'admin',
            senderName: 'WashPal AI',
            senderId: 'ai-bot',
            message: aiResponse.message,
            timestamp: new Date().toISOString(),
            read: true,
            isAI: true
        };

        // Trigger real-time update for AI response
        try {
            await pusherServer.trigger(
                `support-ticket-${actualTicketId}`,
                'new-message',
                aiMessageData
            );
        } catch (pusherError) {
            console.error('[AI Chat] Pusher error (non-critical):', pusherError);
        }

        // Update ticket timestamp
        await ticketsCollection.updateOne(
            { _id: new ObjectId(actualTicketId) },
            { $set: { updatedAt: new Date().toISOString() } }
        );

        console.log('[AI Chat] Request completed successfully:', {
            ticketId: actualTicketId,
            processingTime: `${processingTime}ms`,
            confidence: aiResponse.confidence
        });

        return NextResponse.json({
            success: true,
            ticketId: actualTicketId,
            ticketNumber,
            message: aiResponse.message,
            escalated: false,
            confidence: aiResponse.confidence,
            metadata: aiResponse.metadata
        }, { status: 200 });

    } catch (error) {
        const processingTime = Date.now() - startTime;
        
        console.error('[AI Chat] Error processing request:', {
            error: error instanceof Error ? error.message : 'Unknown error',
            stack: error instanceof Error ? error.stack : undefined,
            processingTime: `${processingTime}ms`,
            timestamp: new Date().toISOString()
        });
        
        // Return appropriate error response
        if (error instanceof AIError) {
            return NextResponse.json({ 
                error: 'AI service error. Please try again or contact support.',
                details: error.message
            }, { status: 503 });
        }
        
        return NextResponse.json({ 
            error: 'Internal server error. Please try again later.' 
        }, { status: 500 });
    }
}
