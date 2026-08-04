/**
 * WashWise Transactional Email Client utilizing Brevo API
 */

export async function sendEmail({
    to,
    subject,
    html,
    attachment,
}: {
    to: string;
    subject: string;
    html: string;
    attachment?: Array<{ content: string; name: string }>;
}) {
    const apiKey = process.env.BREVO_API_KEY;
    // You must verify this email address in your Brevo account
    const senderEmail = process.env.BREVO_SENDER_EMAIL || "your_verified_email@example.com";

    if (!apiKey) {
        console.warn("[Email] BREVO_API_KEY is not defined. Email transmission bypassed.");
        return { success: false, error: "BREVO_API_KEY not configured" };
    }

    try {
        console.log(`[Email] Dispatching email to: ${to} | Subject: ${subject}`);
        
        const payload: any = {
            sender: {
                name: "WashWise",
                email: senderEmail,
            },
            to: [
                { email: to }
            ],
            subject: subject,
            htmlContent: html,
        };

        if (attachment && attachment.length > 0) {
            payload.attachment = attachment;
        }

        const response = await fetch("https://api.brevo.com/v3/smtp/email", {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                "Accept": "application/json",
                "api-key": apiKey,
            },
            body: JSON.stringify(payload),
        });

        const data = await response.json();
        
        if (!response.ok) {
            console.error("[Email] Brevo API responded with error:", data);
            return { success: false, error: data };
        }

        console.log("[Email] Email successfully dispatched via Brevo:", data);
        return { success: true, messageId: data.messageId };
    } catch (error) {
        console.error("[Email] Exception caught during email transmission:", error);
        return { success: false, error };
    }
}

export async function sendNoShowCancellationEmail({
    to,
    customerName,
    orderCode,
    selectedSlot,
    serviceMethod,
}: {
    to: string;
    customerName: string;
    orderCode: string;
    selectedSlot?: string;
    serviceMethod?: string;
}) {
    const isDropOff = serviceMethod && (
        serviceMethod.toLowerCase().includes("drop") || 
        serviceMethod.toLowerCase().includes("self") || 
        serviceMethod.toLowerCase().includes("store")
    );

    const mainMessage = isDropOff
        ? `Your scheduled store drop-off time slot for order <strong>#${orderCode}</strong> ${selectedSlot ? `(${selectedSlot})` : ''} has passed without your laundry items being dropped off at our facility.`
        : `Our courier driver attempted to complete your scheduled pickup/delivery for order <strong>#${orderCode}</strong> ${selectedSlot ? `during the time slot (${selectedSlot})` : ''}, but was unable to reach you or confirm your presence.`;

    const html = `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; border: 1px solid #e2e8f0; border-radius: 8px; overflow: hidden;">
            <div style="background-color: #ef4444; padding: 20px; text-align: center; color: white;">
                <h2 style="margin: 0;">Order Cancellation Notice (No-Show)</h2>
                <p style="margin: 5px 0 0 0; opacity: 0.9;">Order #${orderCode}</p>
            </div>
            <div style="padding: 24px; color: #334155;">
                <p>Dear <strong>${customerName}</strong>,</p>
                <p>${mainMessage}</p>
                <div style="background-color: #fef2f2; border-left: 4px solid #ef4444; padding: 12px; margin: 20px 0; border-radius: 4px;">
                    <p style="margin: 0; color: #991b1b; font-size: 14px;"><strong>Status:</strong> Order Cancelled due to Customer No-Show</p>
                </div>
                <p>If you still require laundry service or believe this was an error, please log back into your WashWise account to place a new order or contact customer support.</p>
                <hr style="border: none; border-top: 1px solid #e2e8f0; margin: 24px 0;" />
                <p style="font-size: 12px; color: #64748b; text-align: center;">WashWise Laundry Services &middot; Customer Care Team</p>
            </div>
        </div>
    `;

    return sendEmail({
        to,
        subject: `[WashWise] Order #${orderCode} Cancelled - Customer No-Show`,
        html,
    });
}

export async function sendWeightVerificationEmail({
    to,
    customerName,
    orderCode,
    verifiedWeight,
    subtotal,
    proofBase64,
}: {
    to: string;
    customerName: string;
    orderCode: string;
    verifiedWeight: number;
    subtotal: number;
    proofBase64?: string;
}) {
    let attachment: Array<{ content: string; name: string }> | undefined;
    let inlineImgHtml = "";

    if (proofBase64) {
        const rawBase64 = proofBase64.includes(",") ? proofBase64.split(",")[1] : proofBase64;
        attachment = [
            {
                content: rawBase64,
                name: `scale-proof-${orderCode}.jpg`,
            },
        ];
        inlineImgHtml = `
            <div style="margin: 20px 0; text-align: center;">
                <p style="font-size: 13px; font-weight: bold; color: #475569; margin-bottom: 8px;">Facility Scale Measurement Proof:</p>
                <img src="${proofBase64}" alt="Scale Proof" style="max-width: 100%; max-height: 320px; border-radius: 8px; border: 1px solid #cbd5e1; box-shadow: 0 2px 8px rgba(0,0,0,0.08);" />
            </div>
        `;
    }

    const html = `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; border: 1px solid #e2e8f0; border-radius: 8px; overflow: hidden;">
            <div style="background-color: #2563eb; padding: 20px; text-align: center; color: white;">
                <h2 style="margin: 0;">Order Weight Verified</h2>
                <p style="margin: 5px 0 0 0; opacity: 0.9;">Order #${orderCode}</p>
            </div>
            <div style="padding: 24px; color: #334155;">
                <p>Dear <strong>${customerName}</strong>,</p>
                <p>Your laundry order <strong>#${orderCode}</strong> has been officially weighed and verified by our facility staff.</p>
                <div style="background-color: #f0fdf4; border-left: 4px solid #16a34a; padding: 16px; margin: 20px 0; border-radius: 4px;">
                    <p style="margin: 0 0 8px 0; color: #15803d; font-size: 15px;"><strong>Verified Weight:</strong> ${verifiedWeight} kg</p>
                    <p style="margin: 0; color: #15803d; font-size: 15px;"><strong>Updated Subtotal:</strong> &#8369;${subtotal.toLocaleString('en-US', { minimumFractionDigits: 2 })}</p>
                </div>
                ${inlineImgHtml}
                <p>Your order totals and service charges have been updated accordingly. You can track your live order progress in your WashWise member portal.</p>
                <hr style="border: none; border-top: 1px solid #e2e8f0; margin: 24px 0;" />
                <p style="font-size: 12px; color: #64748b; text-align: center;">WashWise Laundry Services &middot; Customer Care Team</p>
            </div>
        </div>
    `;

    return sendEmail({
        to,
        subject: `[WashWise] Order #${orderCode} - Verified Weight & Total Recalculation`,
        html,
        attachment,
    });
}

