import { NextRequest, NextResponse } from "next/server";
import { ObjectId } from "mongodb";
import { getDb } from "../../../config/mongodb";
import { logisticsFee as DEFAULT_LOGISTICS_FEE } from "../../../data/new-order";
import { sendEmail } from "../../../lib/email";

export async function GET(request: NextRequest) {
    try {
        const userId = request.headers.get("x-user-id");
        if (!userId || !ObjectId.isValid(userId)) {
            return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
        }

        const { searchParams } = new URL(request.url);
        const transactionId = searchParams.get("id");
        
        const db = await getDb();
        const ordersCollection = db.collection("orders");

        if (transactionId && ObjectId.isValid(transactionId)) {
            const checkout = await db.collection("checkouts").findOne({
                _id: new ObjectId(transactionId),
                userId: new ObjectId(userId)
            });

            if (!checkout) {
                return NextResponse.json({ success: false, error: "Transaction not found" }, { status: 404 });
            }

            const order = await ordersCollection.findOne({
                _id: checkout.orderId
            });

            return NextResponse.json({
                success: true,
                transaction: {
                    ...checkout,
                    _id: checkout._id.toString(),
                    orderId: checkout.orderId.toString(),
                    userId: checkout.userId.toString(),
                    order: order ? {
                        ...order,
                        _id: order._id.toString(),
                        userId: order.userId.toString()
                    } : null
                }
            });
        }

        const page = parseInt(searchParams.get("page") || "1");
        const limit = parseInt(searchParams.get("limit") || "10");
        const skip = (page - 1) * limit;
        
        const filter = { userId: new ObjectId(userId) };
        const checkoutsCollection = db.collection("checkouts");
        const totalCount = await checkoutsCollection.countDocuments(filter);

        const transactions = await checkoutsCollection
            .aggregate([
                { $match: filter },
                { $sort: { createdAt: -1 } },
                { $skip: skip },
                { $limit: limit },
                {
                    $lookup: {
                        from: "orders",
                        localField: "orderId",
                        foreignField: "_id",
                        as: "order",
                    },
                },
                {
                    $unwind: {
                        path: "$order",
                        preserveNullAndEmptyArrays: true,
                    },
                },
            ])
            .toArray();

        return NextResponse.json({
            success: true,
            transactions: transactions.map((t) => ({
                ...t,
                _id: t._id.toString(),
                userId: t.userId.toString(),
                orderId: t.orderId.toString(),
                order: t.order ? {
                    ...t.order,
                    _id: t.order._id.toString(),
                    userId: t.order.userId.toString(),
                } : null
            })),
            pagination: {
                total: totalCount,
                page,
                limit,
                totalPages: Math.ceil(totalCount / limit)
            }
        });
    } catch (error) {
        console.error("Error fetching transactions:", error);
        return NextResponse.json({ success: false, error: "Internal server error" }, { status: 500 });
    }
}

export async function POST(request: NextRequest) {
    try {
        const userId = request.headers.get("x-user-id");
        if (!userId || !ObjectId.isValid(userId)) {
            return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
        }

        const body = await request.json();
        const {
            orderId,
            serviceMethod,
            streetAddress,
            barangay,
            city,
            selectedSlot,
            paymentMethod,
            logisticsFee,
            promoDiscount,
            rewardId,
            finalTotal
        } = body;

        if (!orderId || !ObjectId.isValid(orderId)) {
            return NextResponse.json({ success: false, error: "Invalid Order ID" }, { status: 400 });
        }

        const db = await getDb();
        const ordersCollection = db.collection("orders");
        const checkoutsCollection = db.collection("checkouts");

        // 1. Verify order belongs to user and is in draft status
        const order = await ordersCollection.findOne({
            _id: new ObjectId(orderId),
            userId: new ObjectId(userId)
        });

        if (!order) {
            return NextResponse.json({ success: false, error: "Order not found" }, { status: 404 });
        }

        // 2. Handle Reward Redemption (determine rewardDiscount before final pricing)
        let rewardDiscount = 0;
        if (rewardId) {
            const { rewardsMilestonesData } = await import("../../../data/rewards");
            const milestone = rewardsMilestonesData.find(m => m.id === rewardId);
            if (milestone) {
                rewardDiscount = milestone.discountAmount || 0;

                // Deduct points in ledger
                await db.collection("rewards_ledger").insertOne({
                    userId: new ObjectId(userId),
                    type: "redeem",
                    points: milestone.pointsRequired,
                    description: `Redeemed ${milestone.reward} for Order #${orderId.slice(-6).toUpperCase()}`,
                    orderId: new ObjectId(orderId),
                    rewardId: rewardId,
                    createdAt: new Date()
                });
            }
        }

        // 3. Server-authoritative pricing calculation
        // Recompute subtotal from canonical service prices
        try {
            const servicesCollection = db.collection("services");
            const dbServices = await servicesCollection.find({}).toArray();

            let subtotal = 0;
            for (const s of order.services || []) {
                const cfg = dbServices.find((svc) => svc.id === s.id);
                if (!cfg) {
                    return NextResponse.json({ success: false, error: `Unknown service in order: ${s.id}` }, { status: 400 });
                }
                subtotal += (Number(s.quantity) || 0) * cfg.price;
            }

            // Enforce server-authoritative logistics fee
            let expectedLogistics = 0;
            if (serviceMethod === "pickup") {
                expectedLogistics = DEFAULT_LOGISTICS_FEE;
            }

            const logisticsFeeNumber = Number(logisticsFee);
            if (logisticsFeeNumber !== expectedLogistics) {
                return NextResponse.json({ success: false, error: `Invalid logistics fee. Expected: ₱${expectedLogistics.toFixed(2)}, got: ₱${logisticsFeeNumber.toFixed(2)}` }, { status: 400 });
            }

            // Enforce server-authoritative first-ride-free promo discount validation
            let expectedPromo = 0;
            if (serviceMethod === "pickup") {
                const previousPickup = await checkoutsCollection.findOne({
                    userId: new ObjectId(userId),
                    serviceMethod: "pickup"
                });
                if (!previousPickup) {
                    expectedPromo = DEFAULT_LOGISTICS_FEE;
                }
            }

            const promoDiscountNumber = Number(promoDiscount);
            if (promoDiscountNumber !== expectedPromo) {
                return NextResponse.json({ success: false, error: `Invalid promo discount. Expected: ₱${expectedPromo.toFixed(2)}, got: ₱${promoDiscountNumber.toFixed(2)}` }, { status: 400 });
            }

            const loyaltyDiscountNumber = Number(order.loyaltyDiscount || 0) || 0;

            const calculatedFinal = Math.max(0, subtotal + logisticsFeeNumber - promoDiscountNumber - rewardDiscount - loyaltyDiscountNumber);

            // If client provided a finalTotal, validate it within a small tolerance
            if (typeof finalTotal !== "undefined") {
                const provided = Number(finalTotal);
                if (Math.abs(provided - calculatedFinal) > 0.01) {
                    console.warn(`[Payment] Price mismatch: expected ₱${calculatedFinal.toFixed(2)}, got ₱${provided.toFixed(2)}`);
                    return NextResponse.json({ success: false, error: `Price mismatch. Expected: ₱${calculatedFinal.toFixed(2)}, got: ₱${provided.toFixed(2)}` }, { status: 400 });
                }
            }

            // 4. Create Checkout Record (server-calculated finalTotal)
            const newCheckout = {
                orderId: new ObjectId(orderId),
                userId: new ObjectId(userId),
                serviceMethod,
                streetAddress: streetAddress || "",
                barangay: barangay || "",
                city: city || "",
                selectedSlot: selectedSlot || "",
                paymentMethod: paymentMethod || "COD",
                logisticsFee: logisticsFeeNumber,
                promoDiscount: promoDiscountNumber,
                rewardId: rewardId || null,
                rewardDiscount,
                loyaltyDiscount: loyaltyDiscountNumber,
                finalTotal: calculatedFinal,
                paymentStatus: "unpaid",
                createdAt: new Date(),
                updatedAt: new Date(),
            };

            const checkoutResult = await checkoutsCollection.insertOne(newCheckout);

            // 5. Update Order Status (do not mark paymentStatus here; admin will record payments)
            await ordersCollection.updateOne(
                { _id: new ObjectId(orderId) },
                {
                    $set: {
                        status: "waiting",
                        loyaltyDiscount: loyaltyDiscountNumber,
                        updatedAt: new Date()
                    }
                }
            );

            // 6. Email the Member their Digital Receipt
            try {
                const user = await db.collection("users").findOne({ _id: new ObjectId(userId) });
                if (user?.email) {
                    const orderCode = orderId.toString().slice(-6).toUpperCase();
                    const servicesHtml = (order.services || []).map((s: { label: string; quantity: number; unitLabel: string; lineTotal?: number }) => `
                        <tr>
                            <td style="padding: 8px; border-bottom: 1px solid #eee;">${s.label}</td>
                            <td style="padding: 8px; border-bottom: 1px solid #eee; text-align: center;">${s.quantity} ${s.unitLabel}</td>
                            <td style="padding: 8px; border-bottom: 1px solid #eee; text-align: right;">₱${(s.lineTotal || 0).toFixed(2)}</td>
                        </tr>
                    `).join("");

                    await sendEmail({
                        to: user.email,
                        subject: `[WashWise] Digital Receipt - Order #${orderCode}`,
                        html: `
                            <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto; padding: 25px; border: 1px solid #e0e0e0; border-radius: 12px; box-shadow: 0 4px 10px rgba(0,0,0,0.05);">
                                <div style="text-align: center; margin-bottom: 20px;">
                                    <h2 style="color: #0284c7; margin: 0;">WASHWISE LAUNDRY</h2>
                                    <p style="color: #666; font-size: 13px; margin: 5px 0 0 0;">Premium Laundry & Dry Cleaning Services</p>
                                </div>
                                <hr style="border: 0; border-top: 2px dashed #e0e0e0; margin: 20px 0;" />
                                
                                <h3 style="color: #333; margin-top: 0;">Digital Receipt</h3>
                                <table style="width: 100%; font-size: 13px; color: #555; margin-bottom: 20px;">
                                    <tr>
                                        <td><strong>Order Code:</strong> #${orderCode}</td>
                                        <td style="text-align: right;"><strong>Date:</strong> ${new Date().toLocaleDateString()}</td>
                                    </tr>
                                    <tr>
                                        <td><strong>Service Method:</strong> ${serviceMethod === "pickup" ? "Delivery/Pickup" : "Self-Dropoff"}</td>
                                        <td style="text-align: right;"><strong>Schedule:</strong> ${selectedSlot}</td>
                                    </tr>
                                    <tr>
                                        <td><strong>Payment Method:</strong> ${paymentMethod}</td>
                                        <td style="text-align: right;"><strong>Status:</strong> Awaiting Action</td>
                                    </tr>
                                </table>

                                <table style="width: 100%; border-collapse: collapse; font-size: 13px; margin-bottom: 20px;">
                                    <thead>
                                        <tr style="background-color: #f8fafc;">
                                            <th style="padding: 8px; text-align: left; border-bottom: 2px solid #ddd;">Service</th>
                                            <th style="padding: 8px; text-align: center; border-bottom: 2px solid #ddd;">Qty</th>
                                            <th style="padding: 8px; text-align: right; border-bottom: 2px solid #ddd;">Total</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        ${servicesHtml}
                                    </tbody>
                                </table>

                                <table style="width: 100%; font-size: 13px; margin-bottom: 20px; line-height: 1.6; color: #444;">
                                    <tr>
                                        <td style="padding: 4px 0;">Subtotal</td>
                                        <td style="text-align: right; padding: 4px 0;">₱${subtotal.toFixed(2)}</td>
                                    </tr>
                                    ${logisticsFeeNumber > 0 ? `
                                    <tr>
                                        <td style="padding: 4px 0;">Logistics Fee</td>
                                        <td style="text-align: right; padding: 4px 0;">₱${logisticsFeeNumber.toFixed(2)}</td>
                                    </tr>` : ""}
                                    ${promoDiscountNumber > 0 ? `
                                    <tr>
                                        <td style="padding: 4px 0; color: #16a34a;">Promo Discount</td>
                                        <td style="text-align: right; padding: 4px 0; color: #16a34a;">-₱${promoDiscountNumber.toFixed(2)}</td>
                                    </tr>` : ""}
                                    ${rewardDiscount > 0 ? `
                                    <tr>
                                        <td style="padding: 4px 0; color: #16a34a;">Loyalty Reward Discount</td>
                                        <td style="text-align: right; padding: 4px 0; color: #16a34a;">-₱${rewardDiscount.toFixed(2)}</td>
                                    </tr>` : ""}
                                    <tr style="font-size: 16px; font-weight: bold; border-top: 1px solid #ddd;">
                                        <td style="padding: 10px 0 0 0;">Total Amount</td>
                                        <td style="text-align: right; padding: 10px 0 0 0; color: #0284c7;">₱${calculatedFinal.toFixed(2)}</td>
                                    </tr>
                                </table>

                                <div style="text-align: center; margin-top: 30px; font-size: 12px; color: #888;">
                                    <p>Thank you for choosing WashWise!</p>
                                    <p>If you have any questions, please contact our support team in the app.</p>
                                </div>
                            </div>
                        `
                    });
                }
            } catch (emailErr) {
                console.error("Failed to send checkout digital receipt email:", emailErr);
            }

            return NextResponse.json({
                success: true,
                transactionId: checkoutResult.insertedId.toString()
            });
        } catch (err) {
            console.error("Error calculating pricing:", err);
            return NextResponse.json({ success: false, error: "Internal server error" }, { status: 500 });
        }
    } catch (error) {
        console.error("Error processing checkout:", error);
        return NextResponse.json({ success: false, error: "Internal server error" }, { status: 500 });
    }
}

export async function PATCH(request: NextRequest) {
    try {
        const userId = request.headers.get("x-user-id");
        if (!userId || !ObjectId.isValid(userId)) {
            return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
        }

        const body = await request.json();
        const { orderId, status } = body;

        if (!orderId || !ObjectId.isValid(orderId) || !status) {
            return NextResponse.json({ success: false, error: "Invalid data" }, { status: 400 });
        }

        const db = await getDb();
        const result = await db.collection("orders").updateOne(
            { _id: new ObjectId(orderId), userId: new ObjectId(userId) },
            { $set: { status, updatedAt: new Date() } }
        );

        if (result.matchedCount === 0) {
            return NextResponse.json({ success: false, error: "Order not found" }, { status: 404 });
        }

        return NextResponse.json({ success: true });
    } catch (error) {
        console.error("Error updating transaction:", error);
        return NextResponse.json({ success: false, error: "Internal server error" }, { status: 500 });
    }
}