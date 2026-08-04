import { NextRequest, NextResponse } from "next/server";
import { GoogleGenerativeAI } from "@google/generative-ai";

export async function POST(request: NextRequest) {
	try {
		const body = await request.json();
		const { serviceNames } = body;

		const servicesText = Array.isArray(serviceNames) && serviceNames.length > 0
			? serviceNames.join(", ")
			: "General Laundry Service";

		const apiKey = process.env.GEMINI_API_KEY;

		if (apiKey) {
			try {
				const genAI = new GoogleGenerativeAI(apiKey);
				const model = genAI.getGenerativeModel({ model: process.env.GOOGLE_AI_MODEL || "gemini-1.5-flash" });

				const prompt = `You are WashWise AI, a helpful laundry assistant.
The customer has selected the following laundry service(s): "${servicesText}".
Generate 3 short, helpful, practical special instructions (under 6 words each) that a customer might want for their clothes (e.g., "Use mild detergent for whites", "Hang dry delicate shirts", "Extra rinse for sensitive skin").
Return ONLY a valid JSON array of 3 strings, with no markdown code blocks or extra text.
Example format: ["Use hypoallergenic detergent", "Hang dry silk items", "Low heat tumble dry"]`;

				const result = await model.generateContent(prompt);
				const text = result.response.text().trim();

				// Clean up markdown block if model wrapped it
				const cleanText = text.replace(/```json/gi, "").replace(/```/g, "").trim();
				const parsed = JSON.parse(cleanText);

				if (Array.isArray(parsed) && parsed.length > 0) {
					return NextResponse.json({ success: true, suggestions: parsed });
				}
			} catch (aiErr) {
				console.warn("Gemini API call failed, falling back to smart defaults:", aiErr);
			}
		}

		// Fallback suggestions based on selected services
		const fallbackSuggestions: string[] = [];
		const lowerServices = servicesText.toLowerCase();

		if (lowerServices.includes("wash") || lowerServices.includes("fold")) {
			fallbackSuggestions.push("Use color-safe detergent", "Separate whites from darks", "Extra soft fold for shirts");
		} else if (lowerServices.includes("press") || lowerServices.includes("iron")) {
			fallbackSuggestions.push("Low heat iron for delicate fabrics", "Hang ironed shirts on hangers", "Steam press collars");
		} else if (lowerServices.includes("dry clean")) {
			fallbackSuggestions.push("Spot treat minor collar stains", "Gentle solvent cycle for wool", "Return in garment bags");
		} else {
			fallbackSuggestions.push("Use hypoallergenic detergent", "Air dry delicate garments", "Double rinse for sensitive skin");
		}

		return NextResponse.json({ success: true, suggestions: fallbackSuggestions });
	} catch (error) {
		console.error("AI Instruction Generator Error:", error);
		return NextResponse.json({
			success: true,
			suggestions: [
				"Use mild scent-free detergent",
				"Hang dry sensitive items",
				"Separate delicate fabrics"
			]
		});
	}
}
