import { NextRequest, NextResponse } from "next/server";
import { ObjectId } from "mongodb";
import { getDb } from "../../../../config/mongodb";

export async function PATCH(
	request: NextRequest,
	{ params }: { params: Promise<{ id: string }> }
) {
	try {
		const { id } = await params;
		const db = await getDb();
		const servicesCollection = db.collection("services");
		const body = await request.json();

		const { _id, createdAt, ...updateData } = body;

		if (updateData.price !== undefined) updateData.price = Number(updateData.price);
		updateData.updatedAt = new Date().toISOString();

		// Fetch the old service to compare prices
		const oldService = await servicesCollection.findOne({ _id: new ObjectId(id) });
		if (!oldService) {
			return NextResponse.json({ success: false, error: "Service not found" }, { status: 404 });
		}

		const priceChanged = updateData.price !== undefined && oldService.price !== updateData.price;

		const result = await servicesCollection.findOneAndUpdate(
			{ _id: new ObjectId(id) },
			{ $set: updateData },
			{ returnDocument: 'after' }
		);

		// Log activity
		const { recordActivity } = await import("../../../../lib/logger");
		await recordActivity({
			type: "service-updated",
			performedBy: "Admin",
			details: `Updated service: ${result?.label}${priceChanged ? ` (Price changed to ₱${result?.price})` : ""}`
		});

		if (priceChanged) {
			// Notify customers asynchronously
			const usersCollection = db.collection("users");
			const customers = await usersCollection.find({ email: { $exists: true, $ne: "" } }).toArray();
			
			// We dynamically import sendEmail to avoid issues if not used elsewhere
			const { sendEmail } = await import("../../../../lib/email");
			
			const emailPromises = customers.map(customer => {
				const htmlContent = `
					<div style="font-family: sans-serif; max-width: 600px; margin: 0 auto; color: #333;">
						<h2 style="color: #11998e;">Price Update Notification</h2>
						<p>Hi ${customer.username || 'Valued Customer'},</p>
						<p>We want to inform you that the price for our <strong>${result?.label}</strong> service has been updated.</p>
						<p>The new price is <strong>₱${result?.price}</strong> per ${result?.unitLabel}.</p>
						<p>Thank you for choosing WashWays!</p>
					</div>
				`;
				return sendEmail({
					to: customer.email,
					subject: `Update on ${result?.label} Pricing`,
					html: htmlContent
				}).catch(console.error);
			});
			
			// Fire and forget emails
			Promise.allSettled(emailPromises);

			// Push Notification
			const { broadcastToSubscriptions } = await import("../../../../lib/push");
			const allPushSubscriptions = customers.flatMap((c: any) => c.pushSubscriptions || []);
			if (allPushSubscriptions.length > 0) {
				const pushPayload = {
					title: "Price Update",
					body: `The price for ${result?.label} has been updated to ₱${result?.price}.`,
					url: "/member/new-order"
				};
				broadcastToSubscriptions(allPushSubscriptions, pushPayload).catch(console.error);
			}
		}

		return NextResponse.json({ success: true, service: result });
	} catch (error) {
		console.error("Error updating service:", error);
		return NextResponse.json({ success: false, error: "Internal server error" }, { status: 500 });
	}
}

export async function DELETE(
	request: NextRequest,
	{ params }: { params: Promise<{ id: string }> }
) {
	try {
		const { id } = await params;
		const db = await getDb();
		const servicesCollection = db.collection("services");

		const result = await servicesCollection.deleteOne({ _id: new ObjectId(id) });

		if (result.deletedCount === 0) {
			return NextResponse.json({ success: false, error: "Service not found" }, { status: 404 });
		}

		// Log activity
		const { recordActivity } = await import("../../../../lib/logger");
		await recordActivity({
			type: "service-deleted",
			performedBy: "Admin",
			details: `Deleted a service.`
		});

		return NextResponse.json({ success: true, message: "Service deleted successfully" });
	} catch (error) {
		console.error("Error deleting service:", error);
		return NextResponse.json({ success: false, error: "Internal server error" }, { status: 500 });
	}
}
