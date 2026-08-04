import { NextRequest, NextResponse } from "next/server";
import { ObjectId } from "mongodb";
import bcrypt from "bcrypt";
import { getDb } from "../../../../config/mongodb";

export async function PATCH(request: NextRequest) {
	try {
		const userId = request.headers.get("x-user-id");
		if (!userId || !ObjectId.isValid(userId)) {
			return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
		}

		let body: { currentPassword?: string; newPassword?: string; confirmPassword?: string };
		try {
			body = await request.json();
		} catch {
			return NextResponse.json({ success: false, error: "Invalid JSON body" }, { status: 400 });
		}

		const { currentPassword, newPassword, confirmPassword } = body;

		if (!currentPassword || !newPassword || !confirmPassword) {
			return NextResponse.json(
				{ success: false, error: "All password fields are required" },
				{ status: 400 }
			);
		}

		if (newPassword !== confirmPassword) {
			return NextResponse.json(
				{ success: false, error: "New passwords do not match" },
				{ status: 400 }
			);
		}

		if (newPassword.length < 8) {
			return NextResponse.json(
				{ success: false, error: "New password must be at least 8 characters" },
				{ status: 400 }
			);
		}

		const db = await getDb();
		const usersCollection = db.collection("users");

		const user = await usersCollection.findOne({ _id: new ObjectId(userId) });
		if (!user) {
			return NextResponse.json({ success: false, error: "User not found" }, { status: 404 });
		}

		if (typeof user.password !== "string") {
			return NextResponse.json(
				{ success: false, error: "Account password is not set" },
				{ status: 400 }
			);
		}

		const isCurrentPasswordValid = await bcrypt.compare(currentPassword, user.password);
		if (!isCurrentPasswordValid) {
			return NextResponse.json(
				{ success: false, error: "Current password is incorrect" },
				{ status: 400 }
			);
		}

		const hashedPassword = await bcrypt.hash(newPassword, 10);

		await usersCollection.updateOne(
			{ _id: new ObjectId(userId) },
			{ $set: { password: hashedPassword, updatedAt: new Date() } }
		);

		return NextResponse.json({
			success: true,
			message: "Password updated successfully",
		});
	} catch (error) {
		console.error("Error updating password:", error);
		return NextResponse.json({ success: false, error: "Internal server error" }, { status: 500 });
	}
}
