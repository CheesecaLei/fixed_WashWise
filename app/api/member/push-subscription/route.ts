import { NextRequest, NextResponse } from "next/server";
import { ObjectId } from "mongodb";
import { getDb } from "../../../config/mongodb";

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

    const { subscription } = body;
    if (!subscription || !subscription.endpoint) {
      return NextResponse.json({ success: false, error: "Invalid subscription" }, { status: 400 });
    }

    const db = await getDb();
    const usersCollection = db.collection("users");

    // Add subscription to the user's pushSubscriptions array if it doesn't already exist
    await usersCollection.updateOne(
      { _id: new ObjectId(userId) },
      { $addToSet: { pushSubscriptions: subscription } }
    );

    return NextResponse.json({ success: true, message: "Subscription saved successfully" });
  } catch (error) {
    console.error("Error saving push subscription:", error);
    return NextResponse.json({ success: false, error: "Internal server error" }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest) {
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

    const { endpoint } = body;
    if (!endpoint) {
      return NextResponse.json({ success: false, error: "Missing endpoint" }, { status: 400 });
    }

    const db = await getDb();
    const usersCollection = db.collection("users");

    // Remove subscription matching the endpoint
    await usersCollection.updateOne(
      { _id: new ObjectId(userId) },
      { $pull: { pushSubscriptions: { endpoint: endpoint } } as any }
    );

    return NextResponse.json({ success: true, message: "Subscription removed successfully" });
  } catch (error) {
    console.error("Error removing push subscription:", error);
    return NextResponse.json({ success: false, error: "Internal server error" }, { status: 500 });
  }
}
