import { NextRequest, NextResponse } from "next/server";
import { getDb } from "../../config/mongodb";

export async function GET(request: NextRequest) {
	try {
		const db = await getDb();
		const servicesCollection = db.collection("services");

		// Automatically rename Quick Dry to Dry Clean
		await servicesCollection.updateMany(
			{ name: { $in: ["Quick dry", "Quick Dry"] } },
			{ $set: { name: "Dry Clean" } }
		);

		const { searchParams } = new URL(request.url);
		const page = searchParams.get("page") ? parseInt(searchParams.get("page")!) : null;
		const limit = searchParams.get("limit") ? parseInt(searchParams.get("limit")!) : null;

		let services;
		let pagination = null;

		if (page !== null && limit !== null) {
			const skip = (page - 1) * limit;
			const totalCount = await servicesCollection.countDocuments({});
			services = await servicesCollection.find({}).skip(skip).limit(limit).toArray();
			pagination = {
				total: totalCount,
				page,
				limit,
				totalPages: Math.ceil(totalCount / limit)
			};
		} else {
			services = await servicesCollection.find({}).toArray();
		}

		const sanitizedServices = services.map(service => {
			const s = { ...service };
			if (s.inputLabel && s.inputLabel.endsWith(':')) {
				s.inputLabel = s.inputLabel.slice(0, -1).trim();
			}
			if (s.placeholder) {
				delete s.placeholder; // Remove placeholder property entirely
			}
			return s;
		});

		return NextResponse.json({ success: true, services: sanitizedServices, pagination });
	} catch (error) {
		console.error("Error fetching services:", error);
		return NextResponse.json({ success: false, error: "Internal server error" }, { status: 500 });
	}
}
