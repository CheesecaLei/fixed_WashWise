import { NextRequest, NextResponse } from "next/server";
import { ObjectId } from "mongodb";
import { getDb } from "../../../config/mongodb";
import { recordActivity } from "../../../lib/logger";

export async function GET(request: NextRequest) {
	try {
		const userId = request.headers.get("x-user-id");
		if (!userId || !ObjectId.isValid(userId)) {
			return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
		}

		const db = await getDb();
		const requestsCollection = db.collection("profile_requests");

		const requests = await requestsCollection
			.find({ userId: new ObjectId(userId) })
			.sort({ createdAt: -1 })
			.toArray();

		const formattedRequests = requests.map((req) => ({
			id: req._id.toString(),
			field: req.field,
			currentValue: req.currentValue || "",
			proposedValue: req.proposedValue || "",
			reason: req.reason || "",
			status: req.status || "pending",
			rejectionReason: req.rejectionReason || "",
			createdAt: req.createdAt ? new Date(req.createdAt).toISOString() : new Date().toISOString(),
			reviewedAt: req.reviewedAt ? new Date(req.reviewedAt).toISOString() : null,
		}));

		return NextResponse.json({
			success: true,
			requests: formattedRequests,
		});
	} catch (error) {
		console.error("Error fetching profile requests:", error);
		return NextResponse.json({ success: false, error: "Internal server error" }, { status: 500 });
	}
}

export async function POST(request: NextRequest) {
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

		const { field, proposedValue, reason } = body;

		if (!field || !["username", "contactNo", "email"].includes(field)) {
			return NextResponse.json({ success: false, error: "Invalid or missing field type" }, { status: 400 });
		}

		const trimmedValue = (proposedValue || "").trim();
		const trimmedReason = (reason || "").trim();

		if (!trimmedValue) {
			return NextResponse.json({ success: false, error: "Proposed value is required" }, { status: 400 });
		}

		if (!trimmedReason) {
			return NextResponse.json({ success: false, error: "Reason for change is required" }, { status: 400 });
		}

		const db = await getDb();
		const usersCollection = db.collection("users");
		const requestsCollection = db.collection("profile_requests");

		const user = await usersCollection.findOne({ _id: new ObjectId(userId) });
		if (!user) {
			return NextResponse.json({ success: false, error: "User not found" }, { status: 404 });
		}

		const currentValue = user[field] || "";

		if (currentValue === trimmedValue) {
			return NextResponse.json({ success: false, error: "Proposed value is identical to your current value." }, { status: 400 });
		}

		// Validation & Uniqueness check
		if (field === "email") {
			const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
			if (!emailRegex.test(trimmedValue)) {
				return NextResponse.json({ success: false, error: "Invalid email format" }, { status: 400 });
			}
			const existingEmail = await usersCollection.findOne({
				email: trimmedValue.toLowerCase(),
				_id: { $ne: new ObjectId(userId) },
			});
			if (existingEmail) {
				return NextResponse.json({ success: false, error: "Email address is already in use by another account" }, { status: 400 });
			}
		}

		if (field === "username") {
			const existingUsername = await usersCollection.findOne({
				username: trimmedValue,
				_id: { $ne: new ObjectId(userId) },
			});
			if (existingUsername) {
				return NextResponse.json({ success: false, error: "Username is already in use by another account" }, { status: 400 });
			}
		}

		// Check for existing pending request for the same field
		const existingPending = await requestsCollection.findOne({
			userId: new ObjectId(userId),
			field,
			status: "pending",
		});

		if (existingPending) {
			return NextResponse.json({
				success: false,
				error: `You already have a pending update request for '${field}'. Please wait for Admin approval.`,
			}, { status: 400 });
		}

		const now = new Date();
		const newRequest = {
			userId: new ObjectId(userId),
			userName: user.username || "Member",
			userEmail: user.email || "",
			field,
			currentValue,
			proposedValue: trimmedValue,
			reason: trimmedReason,
			status: "pending",
			createdAt: now,
			updatedAt: now,
		};

		const result = await requestsCollection.insertOne(newRequest);

		await recordActivity({
			type: "profile-request-submitted",
			customerName: user.username || "Member",
			performedBy: "Member",
			details: `Submitted profile update request for ${field}: '${currentValue}' → '${trimmedValue}'`,
		});

		// Trigger real-time Pusher event for Admin
		try {
			const { pusherServer } = await import("../../../lib/pusher");
			await pusherServer.trigger("admin-profile-requests", "new-profile-request", {
				id: result.insertedId.toString(),
				userId: userId,
				userName: user.username || "Member",
				userEmail: user.email || "",
				userPhone: user.contactNo || "",
				field,
				currentValue,
				proposedValue: trimmedValue,
				reason: trimmedReason,
				status: "pending",
				createdAt: now.toISOString(),
			});
		} catch (pusherErr) {
			console.error("Pusher trigger failed:", pusherErr);
		}

		return NextResponse.json({
			success: true,
			message: "Profile update request submitted successfully",
			requestId: result.insertedId.toString(),
		});
	} catch (error) {
		console.error("Error submitting profile request:", error);
		return NextResponse.json({ success: false, error: "Internal server error" }, { status: 500 });
	}
}
