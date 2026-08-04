import { NextRequest, NextResponse } from "next/server";
import { ObjectId } from "mongodb";
import { getDb } from "../../../config/mongodb";
import { recordActivity } from "../../../lib/logger";

export async function GET(request: NextRequest) {
	try {
		const userRole = request.headers.get("x-user-role");
		if (userRole !== "admin") {
			return NextResponse.json({ success: false, error: "Forbidden: Admin access required" }, { status: 403 });
		}

		const { searchParams } = new URL(request.url);
		const statusFilter = searchParams.get("status") || "all";
		const search = searchParams.get("search") || "";
		const page = parseInt(searchParams.get("page") || "1");
		const limit = parseInt(searchParams.get("limit") || "10");
		const skip = (page - 1) * limit;

		const db = await getDb();
		const requestsCollection = db.collection("profile_requests");
		const usersCollection = db.collection("users");

		const filter: any = {};
		if (statusFilter !== "all") {
			filter.status = statusFilter;
		}

		if (search) {
			filter.$or = [
				{ userName: { $regex: search, $options: "i" } },
				{ userEmail: { $regex: search, $options: "i" } },
				{ field: { $regex: search, $options: "i" } },
				{ proposedValue: { $regex: search, $options: "i" } },
			];
		}

		const totalCount = await requestsCollection.countDocuments(filter);
		const pendingCount = await requestsCollection.countDocuments({ status: "pending" });

		const rawRequests = await requestsCollection
			.find(filter)
			.sort({ createdAt: -1 })
			.skip(skip)
			.limit(limit)
			.toArray();

		// Enrich request list with current user data if user still exists
		const requests = await Promise.all(
			rawRequests.map(async (req) => {
				const user = await usersCollection.findOne({ _id: req.userId }, { projection: { password: 0 } });
				return {
					id: req._id.toString(),
					userId: req.userId.toString(),
					userName: user?.username || req.userName || "Unknown",
					userEmail: user?.email || req.userEmail || "",
					userPhone: user?.contactNo || "",
					field: req.field,
					currentValue: req.currentValue || (user ? user[req.field] : "") || "",
					proposedValue: req.proposedValue || "",
					reason: req.reason || "",
					status: req.status || "pending",
					rejectionReason: req.rejectionReason || "",
					createdAt: req.createdAt ? new Date(req.createdAt).toISOString() : new Date().toISOString(),
					reviewedAt: req.reviewedAt ? new Date(req.reviewedAt).toISOString() : null,
				};
			})
		);

		return NextResponse.json({
			success: true,
			requests,
			pendingCount,
			pagination: {
				total: totalCount,
				page,
				limit,
				totalPages: Math.ceil(totalCount / limit) || 1,
			},
		});
	} catch (error) {
		console.error("Error fetching admin profile requests:", error);
		return NextResponse.json({ success: false, error: "Internal server error" }, { status: 500 });
	}
}

export async function PATCH(request: NextRequest) {
	try {
		const adminUserId = request.headers.get("x-user-id");
		const userRole = request.headers.get("x-user-role");

		if (userRole !== "admin") {
			return NextResponse.json({ success: false, error: "Forbidden: Admin access required" }, { status: 403 });
		}

		let body;
		try {
			body = await request.json();
		} catch {
			return NextResponse.json({ success: false, error: "Invalid JSON body" }, { status: 400 });
		}

		const { requestId, action, rejectionReason } = body;

		if (!requestId || !ObjectId.isValid(requestId)) {
			return NextResponse.json({ success: false, error: "Valid Request ID is required" }, { status: 400 });
		}

		if (!["approve", "reject"].includes(action)) {
			return NextResponse.json({ success: false, error: "Action must be 'approve' or 'reject'" }, { status: 400 });
		}

		const db = await getDb();
		const requestsCollection = db.collection("profile_requests");
		const usersCollection = db.collection("users");

		const profileReq = await requestsCollection.findOne({ _id: new ObjectId(requestId) });
		if (!profileReq) {
			return NextResponse.json({ success: false, error: "Profile request not found" }, { status: 404 });
		}

		if (profileReq.status !== "pending") {
			return NextResponse.json(
				{ success: false, error: `Request has already been ${profileReq.status}.` },
				{ status: 400 }
			);
		}

		const now = new Date();

		if (action === "approve") {
			const { userId, field, proposedValue } = profileReq;

			// Double-check uniqueness if updating email or username
			if (field === "email") {
				const existing = await usersCollection.findOne({
					email: proposedValue.toLowerCase(),
					_id: { $ne: userId },
				});
				if (existing) {
					return NextResponse.json(
						{ success: false, error: "Cannot approve: Email is already registered to another account." },
						{ status: 400 }
					);
				}
			} else if (field === "username") {
				const existing = await usersCollection.findOne({
					username: proposedValue,
					_id: { $ne: userId },
				});
				if (existing) {
					return NextResponse.json(
						{ success: false, error: "Cannot approve: Username is already registered to another account." },
						{ status: 400 }
					);
				}
			}

			// Update User document
			const updatePayload: any = {
				[field]: field === "email" ? proposedValue.toLowerCase() : proposedValue,
				updatedAt: now,
			};

			const userUpdateRes = await usersCollection.updateOne(
				{ _id: userId },
				{ $set: updatePayload }
			);

			if (userUpdateRes.matchedCount === 0) {
				return NextResponse.json({ success: false, error: "Target user account not found." }, { status: 404 });
			}

			// Update Request document
			await requestsCollection.updateOne(
				{ _id: new ObjectId(requestId) },
				{
					$set: {
						status: "approved",
						reviewedAt: now,
						reviewedBy: adminUserId ? new ObjectId(adminUserId) : "admin",
						updatedAt: now,
					},
				}
			);

			// Log audit activity
			await recordActivity({
				type: "profile-request-approved",
				customerName: profileReq.userName || "Customer",
				performedBy: "Admin",
				details: `Approved ${field} update for user ${profileReq.userName}: '${profileReq.currentValue}' → '${proposedValue}'`,
			});

			// Trigger Pusher notification
			try {
				const { pusherServer } = await import("../../../lib/pusher");
				const payload = {
					id: requestId,
					userId: userId.toString(),
					userName: profileReq.userName,
					field: profileReq.field,
					currentValue: profileReq.currentValue,
					proposedValue: proposedValue,
					status: "approved",
					reviewedAt: now.toISOString(),
				};
				await pusherServer.trigger("admin-profile-requests", "profile-request-updated", payload);
				await pusherServer.trigger(`user-profile-requests-${userId.toString()}`, "profile-request-updated", payload);
			} catch (pusherErr) {
				console.error("Pusher trigger failed:", pusherErr);
			}

			return NextResponse.json({
				success: true,
				message: `Profile request approved. ${field} has been updated to '${proposedValue}'.`,
			});
		} else {
			// Action is reject
			const trimmedRejectionReason = (rejectionReason || "").trim();

			await requestsCollection.updateOne(
				{ _id: new ObjectId(requestId) },
				{
					$set: {
						status: "rejected",
						rejectionReason: trimmedRejectionReason,
						reviewedAt: now,
						reviewedBy: adminUserId ? new ObjectId(adminUserId) : "admin",
						updatedAt: now,
					},
				}
			);

			await recordActivity({
				type: "profile-request-rejected",
				customerName: profileReq.userName || "Customer",
				performedBy: "Admin",
				details: `Rejected ${profileReq.field} update request for user ${profileReq.userName}. Reason: ${trimmedRejectionReason || "No reason provided"}`,
			});

			// Trigger Pusher notification
			try {
				const { pusherServer } = await import("../../../lib/pusher");
				const payload = {
					id: requestId,
					userId: profileReq.userId.toString(),
					userName: profileReq.userName,
					field: profileReq.field,
					currentValue: profileReq.currentValue,
					proposedValue: profileReq.proposedValue,
					status: "rejected",
					rejectionReason: trimmedRejectionReason,
					reviewedAt: now.toISOString(),
				};
				await pusherServer.trigger("admin-profile-requests", "profile-request-updated", payload);
				await pusherServer.trigger(`user-profile-requests-${profileReq.userId.toString()}`, "profile-request-updated", payload);
			} catch (pusherErr) {
				console.error("Pusher trigger failed:", pusherErr);
			}

			return NextResponse.json({
				success: true,
				message: "Profile request rejected successfully.",
			});
		}
	} catch (error) {
		console.error("Error processing profile request approval:", error);
		return NextResponse.json({ success: false, error: "Internal server error" }, { status: 500 });
	}
}
