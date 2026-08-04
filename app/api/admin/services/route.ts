import { NextRequest, NextResponse } from "next/server";
import { getDb } from "../../../config/mongodb";

export async function POST(request: NextRequest) {
	try {
		const db = await getDb();
		const servicesCollection = db.collection("services");
		const body = await request.json();

		const { label, description, unitLabel, inputLabel, placeholder, price, iconName } = body;

		if (!label || !price || !unitLabel) {
			return NextResponse.json({ success: false, error: "Missing required fields" }, { status: 400 });
		}

		// Create a slug-like ID from the label
		const id = label.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');

		const newService = {
			id,
			label,
			description: description || "",
			unitLabel,
			inputLabel: (inputLabel || "Quantity").replace(/:$/, "").trim(),
			price: Number(price),
			iconName: iconName || "waves",
			createdAt: new Date().toISOString(),
			updatedAt: new Date().toISOString(),
		};

		const result = await servicesCollection.insertOne(newService);

		// Log activity
		const { recordActivity } = await import("../../../lib/logger");
		await recordActivity({
			type: "service-created",
			performedBy: "Admin",
			details: `Created new service: ${label}`
		});

		return NextResponse.json({ 
			success: true, 
			service: { ...newService, _id: result.insertedId } 
		});
	} catch (error) {
		console.error("Error creating service:", error);
		return NextResponse.json({ success: false, error: "Internal server error" }, { status: 500 });
	}
}
