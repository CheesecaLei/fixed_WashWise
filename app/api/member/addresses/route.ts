import { NextRequest, NextResponse } from "next/server";
import { ObjectId } from "mongodb";
import { getDb } from "../../../config/mongodb";

// Addresses are stored in the users document as an array:
// user.addresses = [{ _id, label, fullAddress, note, isDefault, isActive, createdAt }]
// user.address (string) is the registration address — seeded as the default entry on first GET.

async function seedDefaultIfNeeded(usersCollection: any, userId: ObjectId, user: any) {
	// If the user has a plain `address` string from registration but no structured addresses array yet,
	// create the default entry automatically.
	if (
		(!user.addresses || user.addresses.length === 0) &&
		typeof user.address === "string" &&
		user.address.trim()
	) {
		const defaultEntry = {
			_id: new ObjectId(),
			label: "Home",
			fullAddress: user.address.trim(),
			note: "",
			isDefault: true,
			isActive: true,
			createdAt: new Date(),
		};
		await usersCollection.updateOne(
			{ _id: userId },
			{ $set: { addresses: [defaultEntry] } }
		);
		return [defaultEntry];
	}
	return user.addresses ?? [];
}

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

		const addresses = await seedDefaultIfNeeded(usersCollection, new ObjectId(userId), user);

		return NextResponse.json({
			success: true,
			addresses: addresses.map((a: any) => ({
				id: a._id.toString(),
				label: a.label,
				fullAddress: a.fullAddress,
				note: a.note || "",
				isDefault: a.isDefault ?? false,
				isActive: a.isActive ?? false,
				createdAt: a.createdAt,
			})),
		});
	} catch (error) {
		console.error("Error fetching addresses:", error);
		return NextResponse.json({ success: false, error: "Internal server error" }, { status: 500 });
	}
}

export async function POST(request: NextRequest) {
	try {
		const userId = request.headers.get("x-user-id");
		if (!userId || !ObjectId.isValid(userId)) {
			return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
		}

		let body: { label?: string; fullAddress?: string; note?: string };
		try {
			body = await request.json();
		} catch {
			return NextResponse.json({ success: false, error: "Invalid JSON body" }, { status: 400 });
		}

		const { label, fullAddress, note } = body;

		if (!label || !fullAddress) {
			return NextResponse.json(
				{ success: false, error: "Label and address are required" },
				{ status: 400 }
			);
		}

		const db = await getDb();
		const usersCollection = db.collection("users");

		const newEntry = {
			_id: new ObjectId(),
			label: label.trim(),
			fullAddress: fullAddress.trim(),
			note: (note || "").trim(),
			isDefault: false,
			isActive: false,
			createdAt: new Date(),
		};

		await usersCollection.updateOne(
			{ _id: new ObjectId(userId) },
			{ $push: { addresses: newEntry } } as any
		);

		return NextResponse.json({
			success: true,
			address: {
				id: newEntry._id.toString(),
				label: newEntry.label,
				fullAddress: newEntry.fullAddress,
				note: newEntry.note,
				isDefault: newEntry.isDefault,
				isActive: newEntry.isActive,
				createdAt: newEntry.createdAt,
			},
		});
	} catch (error) {
		console.error("Error adding address:", error);
		return NextResponse.json({ success: false, error: "Internal server error" }, { status: 500 });
	}
}

export async function PATCH(request: NextRequest) {
	try {
		const userId = request.headers.get("x-user-id");
		if (!userId || !ObjectId.isValid(userId)) {
			return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
		}

		let body: { addressId?: string; action?: "set-active" | "set-default" };
		try {
			body = await request.json();
		} catch {
			return NextResponse.json({ success: false, error: "Invalid JSON body" }, { status: 400 });
		}

		const { addressId, action } = body;

		if (!addressId || !ObjectId.isValid(addressId)) {
			return NextResponse.json({ success: false, error: "Invalid address ID" }, { status: 400 });
		}

		const db = await getDb();
		const usersCollection = db.collection("users");

		const user = await usersCollection.findOne({ _id: new ObjectId(userId) });
		if (!user) {
			return NextResponse.json({ success: false, error: "User not found" }, { status: 404 });
		}

		const addresses: any[] = user.addresses ?? [];
		const target = addresses.find((a: any) => a._id.toString() === addressId);
		if (!target) {
			return NextResponse.json({ success: false, error: "Address not found" }, { status: 404 });
		}

		if (action === "set-active") {
			// Toggle: deactivate all, then activate the chosen one.
			// If it was already active, it becomes inactive (toggle off).
			const wasActive = target.isActive;
			const updated = addresses.map((a: any) => ({
				...a,
				isActive: wasActive ? false : a._id.toString() === addressId,
			}));
			await usersCollection.updateOne(
				{ _id: new ObjectId(userId) },
				{ $set: { addresses: updated } }
			);
		} else if (action === "set-default") {
			const updated = addresses.map((a: any) => ({
				...a,
				isDefault: a._id.toString() === addressId,
			}));
			await usersCollection.updateOne(
				{ _id: new ObjectId(userId) },
				{ $set: { addresses: updated } }
			);
		} else {
			return NextResponse.json({ success: false, error: "Unknown action" }, { status: 400 });
		}

		return NextResponse.json({ success: true, message: "Address updated" });
	} catch (error) {
		console.error("Error updating address:", error);
		return NextResponse.json({ success: false, error: "Internal server error" }, { status: 500 });
	}
}

export async function DELETE(request: NextRequest) {
	try {
		const userId = request.headers.get("x-user-id");
		if (!userId || !ObjectId.isValid(userId)) {
			return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
		}

		const { searchParams } = new URL(request.url);
		const addressId = searchParams.get("id");

		if (!addressId || !ObjectId.isValid(addressId)) {
			return NextResponse.json({ success: false, error: "Invalid address ID" }, { status: 400 });
		}

		const db = await getDb();
		const usersCollection = db.collection("users");

		const user = await usersCollection.findOne({ _id: new ObjectId(userId) });
		if (!user) {
			return NextResponse.json({ success: false, error: "User not found" }, { status: 404 });
		}

		const addresses: any[] = user.addresses ?? [];
		const target = addresses.find((a: any) => a._id.toString() === addressId);

		if (!target) {
			return NextResponse.json({ success: false, error: "Address not found" }, { status: 404 });
		}

		if (target.isDefault) {
			return NextResponse.json(
				{ success: false, error: "Cannot delete the default address" },
				{ status: 400 }
			);
		}

		await usersCollection.updateOne(
			{ _id: new ObjectId(userId) },
			{ $pull: { addresses: { _id: new ObjectId(addressId) } } } as any
		);

		return NextResponse.json({ success: true, message: "Address deleted" });
	} catch (error) {
		console.error("Error deleting address:", error);
		return NextResponse.json({ success: false, error: "Internal server error" }, { status: 500 });
	}
}
