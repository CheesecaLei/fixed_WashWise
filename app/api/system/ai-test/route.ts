import { NextRequest, NextResponse } from "next/server";
import { getAIResponse } from "../../../lib/ai-chatbot";

/**
 * Development/debug endpoint to test AI chatbot configuration.
 * Usage: GET /api/system/ai-test?message=Hello
 * 
 * Remove or protect this endpoint before going to production.
 */
export async function GET(request: NextRequest) {
    const { searchParams } = new URL(request.url);
    const message = searchParams.get("message") || "Hello, can you help me?";

    try {
        console.log('[AI Test] Testing AI configuration with message:', message);
        
        const response = await getAIResponse(message, []);
        
        return NextResponse.json({
            success: true,
            response: response,
            config: {
                model: process.env.GOOGLE_AI_MODEL || 'gemini-3-flash-preview',
                hasApiKey: !!process.env.GEMINI_API_KEY,
                apiKeyPrefix: process.env.GEMINI_API_KEY?.substring(0, 10) + '...'
            }
        });
    } catch (error) {
        console.error('[AI Test] Error:', error);
        return NextResponse.json({
            success: false,
            error: error instanceof Error ? error.message : String(error),
            stack: error instanceof Error ? error.stack : undefined,
            config: {
                model: process.env.GOOGLE_AI_MODEL || 'gemini-3-flash-preview',
                hasApiKey: !!process.env.GEMINI_API_KEY,
                apiKeyPrefix: process.env.GEMINI_API_KEY?.substring(0, 10) + '...'
            }
        }, { status: 500 });
    }
}
