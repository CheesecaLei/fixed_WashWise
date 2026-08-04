import { NextRequest, NextResponse } from "next/server";
import { ObjectId } from "mongodb";
import { getDb } from "../../../config/mongodb";

export async function GET(request: NextRequest) {
	try {
		const userId = request.headers.get("x-user-id");
		if (!userId || !ObjectId.isValid(userId)) {
			return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
		}

		const db = await getDb();
		const usersCollection = db.collection("users");

		const user = await usersCollection.findOne({ _id: new ObjectId(userId) });

		if (!user) {
			return NextResponse.json({ success: false, error: "User not found" }, { status: 404 });
		}

		return NextResponse.json({
			success: true,
			user: {
				username: user.username || "",
				contactNo: user.contactNo || "",
				email: user.email || "",
				address: user.address || "",
			},
		});
	} catch (error) {
		console.error("Error fetching profile:", error);
		return NextResponse.json({ success: false, error: "Internal server error" }, { status: 500 });
	}
}

export async function PATCH(request: NextRequest) {
	try {
		const userId = request.headers.get("x-user-id");
		if (!userId || !ObjectId.isValid(userId)) {
			return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
		}

		let body;
		try {
			body = await request.json();
		} catch {
			return NextResponse.json({ success: false, error: "Invalid JSON body" }, { status: 400 });
		}

		const { username, contactNo, email, address } = body;

		const db = await getDb();
		const usersCollection = db.collection("users");

		// Validation and uniqueness checks
		if (email) {
			const existingUser = await usersCollection.findOne({
				email,
				_id: { $ne: new ObjectId(userId) },
			});
			if (existingUser) {
				return NextResponse.json({ success: false, error: "Email already in use" }, { status: 400 });
			}
		}

		if (username) {
			const existingUsername = await usersCollection.findOne({
				username,
				_id: { $ne: new ObjectId(userId) },
			});
			if (existingUsername) {
				return NextResponse.json({ success: false, error: "Username already in use" }, { status: 400 });
			}
		}

		const updateData: any = {};
		if (username !== undefined) updateData.username = username;
		if (contactNo !== undefined) updateData.contactNo = contactNo;
		if (email !== undefined) updateData.email = email;
		if (address !== undefined) updateData.address = address;

		if (Object.keys(updateData).length === 0) {
			return NextResponse.json({ success: false, error: "No fields to update" }, { status: 400 });
		}

		const result = await usersCollection.updateOne(
			{ _id: new ObjectId(userId) },
			{ $set: { ...updateData, updatedAt: new Date() } }
		);

		if (result.matchedCount === 0) {
			return NextResponse.json({ success: false, error: "User not found" }, { status: 404 });
		}

		// Log the activity
		const { recordActivity } = await import("../../../lib/logger");
		await recordActivity({
			type: "profile-updated",
			customerName: username || "Customer",
			performedBy: "Member",
			details: "Profile details updated",
		});

		return NextResponse.json({
			success: true,
			message: "Profile updated successfully",
		});
	} catch (error) {
		console.error("Error updating profile:", error);
		return NextResponse.json({ success: false, error: "Internal server error" }, { status: 500 });
	}
}
