import { GoogleGenerativeAI } from '@google/generative-ai';

/**
 * Chat message interface for conversation history
 */
export interface ChatMessage {
    role: 'user' | 'assistant';
    content: string;
    timestamp?: string;
}

/**
 * AI response interface with escalation metadata
 */
export interface AIResponse {
    message: string;
    shouldEscalate: boolean;
    escalationReason?: string;
    confidence: number;
    metadata?: {
        tokensUsed?: number;
        responseTime?: number;
        modelVersion?: string;
    };
}

/**
 * Configuration for AI chatbot
 */
interface AIConfig {
    apiKey: string;
    modelId: string;
    timeout: number;
    maxHistoryLength: number;
    maxInputLength: number;
    temperature: number;
    topP: number;
    topK: number;
    maxOutputTokens: number;
}

/**
 * Error types for better error handling
 */
export enum AIErrorType {
    CONFIGURATION_ERROR = 'CONFIGURATION_ERROR',
    API_ERROR = 'API_ERROR',
    TIMEOUT_ERROR = 'TIMEOUT_ERROR',
    RATE_LIMIT_ERROR = 'RATE_LIMIT_ERROR',
    VALIDATION_ERROR = 'VALIDATION_ERROR',
    UNKNOWN_ERROR = 'UNKNOWN_ERROR'
}

/**
 * Custom error class for AI chatbot errors
 */
export class AIError extends Error {
    constructor(
        public type: AIErrorType,
        message: string,
        public originalError?: unknown
    ) {
        super(message);
        this.name = 'AIError';
    }
}

/**
 * Knowledge base for the laundry service
 * This should ideally be stored in a database or configuration file
 */
const SYSTEM_CONTEXT = `You are WashPal AI Assistant, a helpful customer support chatbot for a laundry and dry cleaning service.

COMPANY INFORMATION:
- Service: Professional laundry, dry cleaning, wash & fold, and pickup/delivery
- Operating hours: Monday-Saturday, 8 AM - 8 PM
- Service areas: Metro Manila and surrounding areas
- Payment methods: Cash, GCash, PayMaya, Credit/Debit cards

SERVICES & PRICING:
- Wash & Fold: ₱80-120 per kg (regular), ₱150-200 per kg (express)
- Dry Cleaning: ₱200-500 per item (depends on garment type)
- Ironing Only: ₱50-80 per kg
- Pickup & Delivery: Free for orders above ₱500, ₱50 fee below
- Express Service: 24-hour turnaround (+50% fee)
- Standard Service: 3-5 days turnaround

HOW TO MANAGE ACCOUNT & ADDRESSES:
- To change delivery address: Go to Profile Settings → Saved Addresses → Add or edit addresses → Save
- To update profile: Navigate to Profile Settings from the account menu
- To change password: Profile Settings → Change Password
- Multiple addresses: You can save multiple delivery addresses and choose during checkout

HOW TO PLACE & TRACK ORDERS:
- Place order: Go to "New Order" → Select service → Choose pickup/delivery → Checkout
- Track order: Go to "My Orders" section to see real-time status updates
- Modify order: Within 2 hours of placement, go to My Orders → Select order → Modify
- Cancel order: Within 2 hours if not yet picked up

COMMON QUESTIONS YOU MUST ANSWER DIRECTLY (DO NOT ESCALATE):
✓ How do I change my delivery address?
✓ How do I track my order?
✓ What are your service hours?
✓ What services do you offer?
✓ How much does wash & fold cost?
✓ How do I place an order?
✓ What payment methods do you accept?
✓ How do I update my profile?
✓ Can I save multiple addresses?
✓ How long does service take?

ONLY ESCALATE TO HUMAN AGENT WHEN:
✗ Customer has a complaint or is dissatisfied
✗ Order-specific issues (lost items, damage, delays on THEIR specific order)
✗ Refund or compensation requests
✗ Technical issues with the app/website (bugs, errors, can't login)
✗ Special requests or custom services not listed
✗ Urgent or emergency situations
✗ Customer explicitly asks for human support
✗ Sensitive account issues (security breaches, billing disputes)

RESPONSE GUIDELINES:
- Answer basic "how-to" questions directly and confidently
- Be friendly, professional, and concise
- Provide step-by-step instructions when needed
- Use Filipino-English (Taglish) when appropriate
- Only escalate if the question requires human judgment or access to specific order data
- Never make promises about refunds or compensation

FORMATTING RULES (CRITICAL):
- DO NOT use markdown formatting (no *, **, ***, _, __, etc.)
- DO NOT use asterisks for emphasis or bold text
- Use plain text only for all responses
- Use quotation marks "like this" for emphasis instead of bold
- Write section names in plain text without special formatting
- Keep responses clean and readable in plain text format
- ALWAYS put each numbered step on its own line
- ALWAYS separate sections with blank lines
- NEVER write multiple numbered items in the same sentence

RESPONSE STRUCTURE (IMPORTANT):
- Break long responses into short, digestible paragraphs
- Use numbered lists for step-by-step instructions (1. 2. 3.)
- Use bullet points (•) for non-sequential items
- Add blank lines between paragraphs for readability
- Keep sentences concise and clear
- Start with a friendly greeting, then provide the answer
- End with an offer to help further
- ALWAYS put each numbered step on a new line
- ALWAYS add a blank line after the greeting
- ALWAYS add a blank line before the closing statement

EXAMPLE GOOD RESPONSE FORMAT:
"Hello! I would be happy to help you with that.

To track your order, please follow these steps:

1. Log in to your WashWise account
2. Navigate to the My Orders section in the menu
3. Select the specific order you want to check
4. You will see real-time status updates on your laundry's progress

This section allows you to see if your items are currently being picked up, washed, or already out for delivery.

Let me know if you need help with anything else!"

IMPORTANT: If the question is about general procedures (how to do something), pricing, or account management, ANSWER IT DIRECTLY. Do NOT escalate.

When escalation is truly needed, start your response with: "ESCALATE_TO_HUMAN: [specific reason]"`;

const COMMON_SUPPORT_RESPONSES: Array<{ patterns: RegExp[]; response: string }> = [
    {
        patterns: [/track/i, /order status/i, /where is my order/i, /my orders/i],
        response: `Hello! To track your order, please follow these steps:

1. Log in to your WashWise account
2. Go to the "My Orders" section
3. Select the order you want to check
4. View the latest status updates and delivery progress

Let me know if you need help with anything else!`
    },
    {
        patterns: [/change (?:my )?(?:delivery )?address/i, /delivery address/i, /update address/i, /edit address/i],
        response: `Hello! To change your delivery address, please follow these steps:

1. Open Profile Settings
2. Select "Saved Addresses"
3. Add a new address or edit an existing one
4. Save your changes before placing your next order

You can also save multiple addresses and choose one during checkout.`
    },
    {
        patterns: [/service hours/i, /hours of operation/i, /when are you open/i, /operating hours/i],
        response: `Hello! Our service hours are Monday to Saturday, 8:00 AM to 8:00 PM.

If you need help outside these hours, you can still leave a message and our support team will respond as soon as possible.`
    },
    {
        patterns: [/what services/i, /services do you offer/i, /what do you offer/i],
        response: `Hello! We offer professional laundry and dry cleaning services, including wash and fold, dry cleaning, ironing only, pickup and delivery, and express service.

If you want, I can also help you choose the right service for your items.`
    },
    {
        patterns: [/wash.?&.?fold/i, /wash and fold/i, /wash fold/i, /wash.*(how much|price|cost)/i],
        response: `Hello! Wash and fold pricing is typically ₱80 to ₱120 per kg for regular service, and ₱150 to ₱200 per kg for express service.

If you want a quote for a specific order, I can help you estimate it based on your items.`
    },
    {
        patterns: [/place an order/i, /new order/i, /how do i order/i, /place order/i],
        response: `Hello! To place an order, please follow these steps:

1. Go to the "New Order" section
2. Select your service
3. Choose pickup or delivery options
4. Review your details and complete checkout

You can track the order later in the "My Orders" section.`
    },
    {
        patterns: [/payment methods/i, /how can i pay/i, /do you accept/i, /gcash/i, /paymaya/i, /credit card/i],
        response: `Hello! We accept cash, GCash, PayMaya, and credit or debit cards.

If you want, I can also explain the best payment option for your order.`
    },
    {
        patterns: [/update my profile/i, /update profile/i, /profile settings/i, /change profile/i, /change password/i],
        response: `Hello! To update your profile, open Profile Settings from your account menu.

There you can edit your name, contact details, email address, and saved address information before saving the changes.`
    },
    {
        patterns: [/multiple addresses/i, /save multiple/i, /saved addresses/i],
        response: `Hello! Yes, you can save multiple delivery addresses.

Go to Profile Settings, open Saved Addresses, and add as many locations as you need. You can choose the right address during checkout.`
    },
    {
        patterns: [/how long/i, /turnaround/i, /service take/i, /processing time/i],
        response: `Hello! Standard service usually takes 3 to 5 days, while express service offers a 24-hour turnaround with an additional fee.

If you want, I can help you choose the fastest option for your order.`
    }
];

function getCommonSupportResponse(message: string): string | null {
    const normalizedMessage = message.toLowerCase().replace(/\s+/g, ' ').trim();

    for (const entry of COMMON_SUPPORT_RESPONSES) {
        if (entry.patterns.some(pattern => pattern.test(normalizedMessage))) {
            return entry.response;
        }
    }

    return null;
}

/**
 * Load and validate AI configuration from environment variables
 */
function loadAIConfig(): AIConfig {
    const apiKey = process.env.GEMINI_API_KEY;
    
    if (!apiKey) {
        throw new AIError(
            AIErrorType.CONFIGURATION_ERROR,
            'GEMINI_API_KEY is not configured in environment variables'
        );
    }
    
    return {
        apiKey,
        modelId: process.env.GOOGLE_AI_MODEL || 'gemini-3-flash-preview',
        timeout: Math.max(5000, Number(process.env.GOOGLE_AI_TIMEOUT_MS) || 25000),
        maxHistoryLength: 10,
        maxInputLength: 2000,
        temperature: 0.7,
        topP: 0.8,
        topK: 40,
        maxOutputTokens: 1024
    };
}

/**
 * Sanitize user input to prevent injection attacks
 */
function sanitizeInput(input: string, maxLength: number): string {
    if (!input || typeof input !== 'string') {
        throw new AIError(AIErrorType.VALIDATION_ERROR, 'Invalid input: must be a non-empty string');
    }
    
    // Trim whitespace and limit length
    const sanitized = input.trim().substring(0, maxLength);
    
    if (sanitized.length === 0) {
        throw new AIError(AIErrorType.VALIDATION_ERROR, 'Invalid input: message cannot be empty');
    }
    
    // Remove potential XSS patterns (basic sanitization)
    const cleaned = sanitized
        .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')
        .replace(/javascript:/gi, '')
        .replace(/on\w+\s*=/gi, '');
    
    return cleaned;
}

/**
 * Validate and normalize conversation history
 */
function normalizeConversationHistory(
    history: ChatMessage[],
    maxLength: number
): ChatMessage[] {
    if (!Array.isArray(history)) {
        return [];
    }
    
    // Filter valid messages and limit history length
    const validHistory = history
        .filter(msg => 
            msg && 
            typeof msg === 'object' && 
            (msg.role === 'user' || msg.role === 'assistant') &&
            typeof msg.content === 'string' &&
            msg.content.trim().length > 0
        )
        .slice(-maxLength);
    
    return validHistory;
}

/**
 * Initialize Google Generative AI client with error handling
 */
function initializeAIClient(apiKey: string): GoogleGenerativeAI {
    try {
        // Google Generative AI constructor accepts API key string directly
        return new GoogleGenerativeAI(apiKey);
    } catch (error) {
        throw new AIError(
            AIErrorType.CONFIGURATION_ERROR,
            'Failed to initialize Google Generative AI client',
            error
        );
    }
}

/**
 * Get generative model with proper configuration
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
function getGenerativeModel(client: GoogleGenerativeAI, config: AIConfig): any {
    try {
        if (typeof client.getGenerativeModel === 'function') {
            return client.getGenerativeModel({
                model: config.modelId,
                systemInstruction: SYSTEM_CONTEXT,
                generationConfig: {
                    temperature: config.temperature,
                    topP: config.topP,
                    topK: config.topK,
                    maxOutputTokens: config.maxOutputTokens,
                },
            });
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        } else if (typeof (client as any).model === 'function') {
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            const model = (client as any).model(config.modelId);
            // Attach system instruction if supported
            if (typeof model.setSystemInstruction === 'function') {
                model.setSystemInstruction(SYSTEM_CONTEXT);
            }
            return model;
        } else {
            throw new Error('Generative model API not found on client');
        }
    } catch (error) {
        throw new AIError(
            AIErrorType.CONFIGURATION_ERROR,
            'Failed to get generative model',
            error
        );
    }
}

/**
 * Start chat session with conversation history
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
function startChatSession(model: any, history: ChatMessage[]): any {
    try {
        if (typeof model.startChat === 'function') {
            // Convert history to Gemini format
            const formattedHistory = history.map(msg => ({
                role: msg.role === 'assistant' ? 'model' : 'user',
                parts: [{ text: msg.content }]
            }));
            return model.startChat({ history: formattedHistory });
        } else if (typeof model.chat === 'function') {
            return model.chat({ history });
        } else {
            throw new Error('Chat API not available on model');
        }
    } catch (error) {
        throw new AIError(
            AIErrorType.API_ERROR,
            'Failed to start chat session',
            error
        );
    }
}

/**
 * Send message with timeout protection
 */
async function sendMessageWithTimeout(
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    chat: any,
    message: string,
    timeoutMs: number
// eslint-disable-next-line @typescript-eslint/no-explicit-any
): Promise<any> {
    const sendPromise = (async () => {
        if (typeof chat.sendMessage === 'function') {
            return await chat.sendMessage(message);
        }
        if (typeof chat.send === 'function') {
            return await chat.send({ input: message });
        }
        throw new Error('No send method available on chat');
    })();
    
    const timeoutPromise = new Promise((_, reject) => 
        setTimeout(() => reject(new AIError(
            AIErrorType.TIMEOUT_ERROR,
            `AI request timeout after ${timeoutMs}ms`
        )), timeoutMs)
    );
    
    return Promise.race([sendPromise, timeoutPromise]);
}

/**
 * Extract text from AI response with multiple format support
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
function extractResponseText(result: any): string {
    if (result == null) {
        throw new AIError(AIErrorType.API_ERROR, 'Empty response from AI service');
    }
    
    // Try different response formats
    if (typeof result === 'string') {
        return result;
    }
    
    // Try Gemini API response format
    if (result.response && typeof result.response.text === 'function') {
        try {
            return result.response.text();
        } catch (error) {
            console.error('[AI Chatbot] Error calling response.text():', error);
            // Fallback: try to extract from candidates
            if (result.response.candidates && Array.isArray(result.response.candidates)) {
                const firstCandidate = result.response.candidates[0];
                if (firstCandidate?.content?.parts && Array.isArray(firstCandidate.content.parts)) {
                    const text = firstCandidate.content.parts
                        .map((part: { text?: string }) => part.text || '')
                        .filter(Boolean)
                        .join('\n');
                    if (text) return text;
                }
            }
            throw error;
        }
    }
    
    // Try direct candidates access
    if (result.candidates && Array.isArray(result.candidates)) {
        const firstCandidate = result.candidates[0];
        if (firstCandidate?.content?.parts && Array.isArray(firstCandidate.content.parts)) {
            const text = firstCandidate.content.parts
                .map((part: { text?: string }) => part.text || '')
                .filter(Boolean)
                .join('\n');
            if (text) return text;
        }
    }
    
    if (typeof result.output === 'string') {
        return result.output;
    }
    
    if (result.output && Array.isArray(result.output)) {
        return result.output
            .map((o: { text?: string }) => o.text || '')
            .filter(Boolean)
            .join('\n');
    }
    
    if (result.message) {
        return typeof result.message === 'string' 
            ? result.message 
            : JSON.stringify(result.message);
    }
    
    console.error('[AI Chatbot] Unable to extract text from response:', JSON.stringify(result, null, 2));
    throw new AIError(AIErrorType.API_ERROR, 'Unable to extract text from AI response');
}

/**
 * Parse escalation from AI response
 */
function parseEscalation(text: string): { shouldEscalate: boolean; reason?: string; cleanedText: string } {
    const escalateMatch = text.match(/^ESCALATE_TO_HUMAN:\s*(.+?)(?:\n|$)/i);
    
    if (escalateMatch) {
        const reason = escalateMatch[1].trim();
        const cleanedText = text.replace(/^ESCALATE_TO_HUMAN:.+?(?:\n|$)/i, '').trim();
        
        return {
            shouldEscalate: true,
            reason,
            cleanedText: cleanedText || "I understand you need assistance with this matter. Let me connect you with our support team who can help you better."
        };
    }
    
    return {
        shouldEscalate: false,
        cleanedText: text
    };
}

/**
 * Clean markdown formatting from text for plain text display
 * Preserves line breaks and improves readability
 */
function cleanMarkdownFormatting(text: string): string {
    let cleaned = text
        // Remove bold/italic markers (**, *, _)
        .replace(/\*\*\*(.+?)\*\*\*/g, '"$1"')  // ***text*** -> "text"
        .replace(/\*\*(.+?)\*\*/g, '"$1"')      // **text** -> "text"
        .replace(/\*(.+?)\*/g, '$1')            // *text* -> text
        .replace(/__(.+?)__/g, '"$1"')          // __text__ -> "text"
        .replace(/_(.+?)_/g, '$1')              // _text_ -> text
        // Remove headers but keep the text
        .replace(/^#{1,6}\s+/gm, '')            // # Header -> Header
        // Convert bullet points to simple bullets
        .replace(/^\s*[-*+]\s+/gm, '• ')        // - item -> • item
        // Remove code blocks
        .replace(/```[\s\S]*?```/g, '')         // ```code``` -> (removed)
        .replace(/`(.+?)`/g, '"$1"')            // `code` -> "code"
        // Preserve intentional line breaks (double newlines)
        .replace(/\n\n/g, '<<<PARAGRAPH_BREAK>>>')
        // Remove single newlines within paragraphs (join lines)
        .replace(/\n/g, ' ')
        // Restore paragraph breaks
        .replace(/<<<PARAGRAPH_BREAK>>>/g, '\n\n')
        // Clean up extra spaces
        .replace(/\s{2,}/g, ' ')                // Multiple spaces -> single space
        .replace(/\n{3,}/g, '\n\n')             // Multiple newlines -> double newline
        .trim();
    
    // Post-process: Add single line breaks for numbered lists (not double)
    // Match patterns like "1. Text 2. Text" and add single line breaks
    cleaned = cleaned.replace(/(\d+\.\s+[^.]+?)\s+(\d+\.)/g, '$1\n$2');
    
    // Add line break after greeting if followed by instruction text
    cleaned = cleaned.replace(/(Hello!|Hi!|Hey!|Greetings!)\s+([A-Z])/g, '$1\n\n$2');
    
    // Add line break before closing statements
    cleaned = cleaned.replace(/\s+(Let me know|Feel free|If you|Please let me know|Don't hesitate)/g, '\n\n$1');
    
    // Add line break before "To [verb]" instructions
    cleaned = cleaned.replace(/\s+(To (?:track|change|update|place|cancel|modify|view|see|check)[^:]*:)/gi, '\n\n$1');
    
    // Add single line break after "To [verb]:" header before first numbered item
    cleaned = cleaned.replace(/(To [^:]+:)\s+(\d+\.)/gi, '$1\n$2');
    
    return cleaned;
}

/**
 * Calculate confidence score based on response quality
 */
function calculateConfidence(text: string, hasEscalation: boolean): number {
    if (hasEscalation) {
        return 0.9;
    }
    
    // Basic heuristics for confidence
    const length = text.length;
    
    if (length < 20) return 0.4;
    if (length < 50) return 0.6;
    if (length < 200) return 0.8;
    if (length < 500) return 0.85;
    
    return 0.7; // Very long responses might be less focused
}

/**
 * Main function to get AI response with comprehensive error handling
 */
export async function getAIResponse(
    userMessage: string,
    conversationHistory: ChatMessage[] = []
): Promise<AIResponse> {
    const startTime = Date.now();
    
    try {
        // Load configuration
        const config = loadAIConfig();
        
        // Sanitize and validate input
        const sanitizedMessage = sanitizeInput(userMessage, config.maxInputLength);

        // Answer common support questions immediately so routine help does not depend on the model.
        const directResponse = getCommonSupportResponse(sanitizedMessage);
        if (directResponse) {
            const responseTime = Date.now() - startTime;

            return {
                message: directResponse,
                shouldEscalate: false,
                confidence: 0.98,
                metadata: {
                    responseTime,
                    modelVersion: 'rule-based-faq'
                }
            };
        }
        
        // Normalize conversation history
        const normalizedHistory = normalizeConversationHistory(
            conversationHistory,
            config.maxHistoryLength
        );
        
        console.log('[AI Chatbot] Processing request:', {
            model: config.modelId,
            messageLength: sanitizedMessage.length,
            historyLength: normalizedHistory.length,
            timestamp: new Date().toISOString()
        });
        
        // Initialize AI client
        const client = initializeAIClient(config.apiKey);
        
        // Get generative model
        const model = getGenerativeModel(client, config);
        
        // Start chat session with history
        const chat = startChatSession(model, normalizedHistory);
        
        // Send message with timeout protection
        const result = await sendMessageWithTimeout(chat, sanitizedMessage, config.timeout);
        
        // Extract text from response
        const responseText = extractResponseText(result);
        
        // Clean markdown formatting for plain text display
        const cleanedResponseText = cleanMarkdownFormatting(responseText);
        
        const responseTime = Date.now() - startTime;
        
        console.log('[AI Chatbot] Response received:', {
            responseTime: `${responseTime}ms`,
            textLength: cleanedResponseText.length,
            hasEscalation: cleanedResponseText.includes('ESCALATE_TO_HUMAN'),
            timestamp: new Date().toISOString()
        });
        
        // Parse escalation
        const { shouldEscalate, reason, cleanedText } = parseEscalation(cleanedResponseText);
        
        // Calculate confidence
        const confidence = calculateConfidence(cleanedText, shouldEscalate);
        
        return {
            message: cleanedText,
            shouldEscalate,
            escalationReason: reason,
            confidence,
            metadata: {
                responseTime,
                modelVersion: config.modelId
            }
        };
        
    } catch (error) {
        const responseTime = Date.now() - startTime;
        
        // Handle known error types
        if (error instanceof AIError) {
            console.error('[AI Chatbot] AI Error:', {
                type: error.type,
                message: error.message,
                responseTime: `${responseTime}ms`,
                timestamp: new Date().toISOString()
            });
            
            return createErrorResponse(error.type, error.message);
        }
        
        // Handle unknown errors
        console.error('[AI Chatbot] Unexpected error:', {
            error: error instanceof Error ? error.message : 'Unknown error',
            stack: error instanceof Error ? error.stack : undefined,
            responseTime: `${responseTime}ms`,
            timestamp: new Date().toISOString()
        });
        
        // Classify error type from error message
        const errorType = classifyError(error);
        const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
        
        return createErrorResponse(errorType, errorMessage);
    }
}

/**
 * Classify error type from error object
 */
function classifyError(error: unknown): AIErrorType {
    if (!(error instanceof Error)) {
        return AIErrorType.UNKNOWN_ERROR;
    }
    
    const message = error.message.toLowerCase();
    
    if (message.includes('api key') || message.includes('403') || message.includes('unauthorized')) {
        return AIErrorType.CONFIGURATION_ERROR;
    }
    
    if (message.includes('404') || message.includes('not found')) {
        return AIErrorType.CONFIGURATION_ERROR;
    }
    
    if (message.includes('timeout') || message.includes('etimedout')) {
        return AIErrorType.TIMEOUT_ERROR;
    }
    
    if (message.includes('rate limit') || message.includes('429') || message.includes('quota')) {
        return AIErrorType.RATE_LIMIT_ERROR;
    }
    
    if (message.includes('invalid') || message.includes('validation')) {
        return AIErrorType.VALIDATION_ERROR;
    }
    
    return AIErrorType.API_ERROR;
}

/**
 * Create error response with appropriate user message
 */
function createErrorResponse(errorType: AIErrorType, technicalMessage: string): AIResponse {
    let userFriendlyMessage: string;
    let escalationReason: string;
    
    switch (errorType) {
        case AIErrorType.CONFIGURATION_ERROR:
            userFriendlyMessage = "I'm currently unable to assist due to a configuration issue. Let me connect you with our support team.";
            escalationReason = 'AI service configuration error';
            console.error('[AI Chatbot] CRITICAL: Configuration error -', technicalMessage);
            break;
            
        case AIErrorType.TIMEOUT_ERROR:
            userFriendlyMessage = "I'm taking too long to respond. Let me connect you with our support team for faster assistance.";
            escalationReason = 'AI service timeout';
            break;
            
        case AIErrorType.RATE_LIMIT_ERROR:
            userFriendlyMessage = "We're experiencing high demand right now. Let me connect you with our support team.";
            escalationReason = 'AI service rate limit exceeded';
            break;
            
        case AIErrorType.VALIDATION_ERROR:
            userFriendlyMessage = "I had trouble understanding your message. Let me connect you with our support team.";
            escalationReason = 'Message validation error';
            break;
            
        case AIErrorType.API_ERROR:
        case AIErrorType.UNKNOWN_ERROR:
        default:
            userFriendlyMessage = "I'm having trouble processing your request right now. Let me connect you with our support team who can assist you.";
            escalationReason = 'AI service error';
            break;
    }
    
    return {
        message: userFriendlyMessage,
        shouldEscalate: true,
        escalationReason,
        confidence: 0.5
    };
}

/**
 * Determine if escalation is needed based on conversation context
 * This provides additional escalation logic beyond AI's decision
 */
export function shouldEscalateBasedOnContext(
    messageCount: number,
    conversationDuration: number,
    userSentiment: 'positive' | 'neutral' | 'negative'
): boolean {
    // Escalate if conversation is too long (AI couldn't resolve in 6 messages)
    if (messageCount > 6) {
        console.log('[AI Chatbot] Escalating: Too many messages', { messageCount });
        return true;
    }
    
    // Escalate if conversation duration exceeds 5 minutes
    if (conversationDuration > 300000) {
        console.log('[AI Chatbot] Escalating: Conversation too long', { 
            duration: `${Math.round(conversationDuration / 1000)}s` 
        });
        return true;
    }
    
    // Escalate if user sentiment is negative
    if (userSentiment === 'negative') {
        console.log('[AI Chatbot] Escalating: Negative sentiment detected');
        return true;
    }
    
    return false;
}
