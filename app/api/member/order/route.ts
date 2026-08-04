import { NextRequest, NextResponse } from "next/server";
import { ObjectId } from "mongodb";
import { getDb } from "../../../config/mongodb";
import type { CreateOrderRequest } from "../../../types/new-order";

export async function POST(request: NextRequest) {
	try {
		const userId = request.headers.get("x-user-id");
		if (!userId || !ObjectId.isValid(userId)) {
			return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
		}

		let body: CreateOrderRequest;
		try {
			body = await request.json();
		} catch {
			return NextResponse.json({ success: false, error: "Invalid JSON body" }, { status: 400 });
		}

		if (!body.services || body.services.length === 0) {
			return NextResponse.json({ success: false, error: "No services selected" }, { status: 400 });
		}

		const MIN_ORDER_WEIGHT_KG = 5; // minimum weight to protect equipment
		const MAX_ORDER_WEIGHT_KG = 20; // maximum single-order machine capacity

		const hasInvalidKgService = (body.services || []).some(s => s && s.unitLabel === "kg" && (Number(s.quantity) || 0) < MIN_ORDER_WEIGHT_KG);

		if (hasInvalidKgService) {
			return NextResponse.json({ success: false, error: `Estimated weight too low — minimum is ${MIN_ORDER_WEIGHT_KG} kg per service.` }, { status: 400 });
		}

		const totalWeight = (body.services || []).reduce((acc, s) => {
			if (s && s.unitLabel === "kg") {
				return acc + (Number(s.quantity) || 0);
			}
			return acc;
		}, 0);

		if (totalWeight > MAX_ORDER_WEIGHT_KG) {
			return NextResponse.json({ success: false, error: `Order exceeds maximum allowed weight of ${MAX_ORDER_WEIGHT_KG} kg. Please split into multiple orders.` }, { status: 400 });
		}

		const db = await getDb();
		const ordersCollection = db.collection("orders");

		const newOrder = {
			userId: new ObjectId(userId),
			services: body.services,
			specialInstructions: body.specialInstructions || "",
			subtotal: Number(body.subtotal) || 0,
			totalWeight,
			status: "draft",
			paymentStatus: "unpaid",
			loyaltyDiscount: 0,
			pickedUpAt: null,
			receivedByStaffAt: null,
			receivedByClientAt: null,
			createdAt: new Date(),
			updatedAt: new Date(),
		};

		const result = await ordersCollection.insertOne(newOrder);

		// Record activity
		const { recordActivity } = await import("../../../lib/logger");
		const customer = await db.collection("users").findOne({ _id: new ObjectId(userId) });
		await recordActivity({
			type: "order-placed",
			orderCode: result.insertedId.toString().slice(-6).toUpperCase(),
			customerName: customer?.username || "Guest",
			performedBy: "Customer",
			details: `Placed a new order with ${body.services?.length || 0} services.`
		});

		return NextResponse.json({
			success: true,
			orderId: result.insertedId.toString(),
		});
	} catch (error) {
		console.error("Error creating order:", error);
		return NextResponse.json({ success: false, error: "Internal server error" }, { status: 500 });
	}
}

export async function GET(request: NextRequest) {
	try {
		const userId = request.headers.get("x-user-id");
		if (!userId || !ObjectId.isValid(userId)) {
			return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
		}

		const { searchParams } = new URL(request.url);
		const orderId = searchParams.get("id");
		const status = searchParams.get("status");

		const db = await getDb();
		const ordersCollection = db.collection("orders");

		// ?status=draft — return the most recent draft order (used after offline sync)
		if (status === "draft") {
			const draftOrder = await ordersCollection.findOne(
				{ userId: new ObjectId(userId), status: "draft" },
				{ sort: { createdAt: -1 } }
			);

			if (!draftOrder) {
				return NextResponse.json({ success: false, error: "No draft order found" }, { status: 404 });
			}

			return NextResponse.json({
				success: true,
				orderId: draftOrder._id.toString(),
				order: {
					...draftOrder,
					_id: draftOrder._id.toString(),
					userId: draftOrder.userId.toString(),
				},
			});
		}

		// ?id= — fetch a specific order by ID
		if (!orderId || !ObjectId.isValid(orderId)) {
			return NextResponse.json({ success: false, error: "Invalid order ID" }, { status: 400 });
		}

		const order = await ordersCollection.findOne({
			_id: new ObjectId(orderId),
			userId: new ObjectId(userId),
		});

		if (!order) {
			return NextResponse.json({ success: false, error: "Order not found" }, { status: 404 });
		}

		const checkout = await db.collection("checkouts").findOne({ orderId: new ObjectId(orderId) });
		
		return NextResponse.json({
			success: true,
			order: {
				...order,
				_id: order._id.toString(),
				userId: order.userId.toString(),
				checkout: checkout ? {
					...checkout,
					_id: checkout._id.toString(),
					orderId: checkout.orderId.toString(),
					userId: checkout.userId.toString()
				} : null
			},
		});
	} catch (error) {
		console.error("Error fetching order:", error);
		return NextResponse.json({ success: false, error: "Internal server error" }, { status: 500 });
	}
}
