import { randomBytes } from 'node:crypto';
import { NextRequest, NextResponse } from 'next/server';
import { getDb } from '../../../config/mongodb';
import { sendEmail } from '../../../lib/email';

export const runtime = 'nodejs';

const VERIFY_TOKEN_EXPIRY_HOURS = 24;
const RESEND_COOLDOWN_SECONDS = 60;

function buildVerificationEmailHtml(username: string, verifyUrl: string): string {
    return `
<!DOCTYPE html>
<html>
<head><meta charset="UTF-8"><meta name="viewport" content="width=device-width, initial-scale=1.0"></head>
<body style="margin:0;padding:0;background:#f8fafc;font-family:Arial,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#f8fafc;padding:40px 0;">
    <tr><td align="center">
      <table width="560" cellpadding="0" cellspacing="0" style="background:#ffffff;border-radius:12px;overflow:hidden;box-shadow:0 4px 24px rgba(0,0,0,0.08);">
        <tr><td style="background:linear-gradient(135deg,#11998e,#38ef7d);padding:36px;text-align:center;">
          <h1 style="margin:0;color:#ffffff;font-size:26px;font-weight:800;">WashWise</h1>
          <p style="margin:8px 0 0;color:rgba(255,255,255,0.85);font-size:14px;">Laundry, made effortless.</p>
        </td></tr>
        <tr><td style="padding:40px 36px;">
          <h2 style="margin:0 0 12px;color:#0f172a;font-size:20px;font-weight:700;">New verification link</h2>
          <p style="margin:0 0 24px;color:#475569;font-size:15px;line-height:1.6;">Hi <strong>${username}</strong>, here is your new verification link. Click the button below to verify your email.</p>
          <div style="text-align:center;margin:32px 0;">
            <a href="${verifyUrl}" style="background:linear-gradient(135deg,#11998e,#38ef7d);color:#ffffff;text-decoration:none;padding:14px 36px;border-radius:8px;font-size:15px;font-weight:700;display:inline-block;">Verify Email Address</a>
          </div>
          <p style="margin:0 0 8px;color:#94a3b8;font-size:13px;">This link expires in <strong>24 hours</strong>.</p>
          <p style="margin:0;color:#94a3b8;font-size:12px;word-break:break-all;">Or paste: ${verifyUrl}</p>
        </td></tr>
        <tr><td style="background:#f8fafc;padding:20px 36px;text-align:center;border-top:1px solid #e2e8f0;">
          <p style="margin:0;color:#94a3b8;font-size:12px;">&copy; ${new Date().getFullYear()} WashWise Laundry Services</p>
        </td></tr>
      </table>
    </td></tr>
  </table>
</body>
</html>`;
}

export async function POST(request: NextRequest) {
    let body: { email?: string };
    try {
        body = await request.json();
    } catch {
        return NextResponse.json({ error: 'Invalid request.' }, { status: 400 });
    }

    const email = typeof body.email === 'string' ? body.email.trim().toLowerCase() : '';
    if (!email) {
        return NextResponse.json({ error: 'Email is required.' }, { status: 400 });
    }

    try {
        const db = await getDb();
        const usersCollection = db.collection('users');
        const user = await usersCollection.findOne({ email: { $regex: `^${email}$`, $options: 'i' } });

        if (!user) {
            // Return 200 to avoid email enumeration
            return NextResponse.json({ message: 'If that email exists, a new verification link has been sent.' }, { status: 200 });
        }

        if (user.isVerified === true) {
            return NextResponse.json({ error: 'This account is already verified.' }, { status: 400 });
        }

        // Rate limit: check if last token was issued less than RESEND_COOLDOWN_SECONDS ago
        if (user.emailVerificationExpiry) {
            const tokenAge = Date.now() - (new Date(user.emailVerificationExpiry).getTime() - VERIFY_TOKEN_EXPIRY_HOURS * 60 * 60 * 1000);
            if (tokenAge < RESEND_COOLDOWN_SECONDS * 1000) {
                return NextResponse.json({ error: 'Please wait before requesting another verification email.' }, { status: 429 });
            }
        }

        // Generate new token
        const verificationToken = randomBytes(32).toString('hex');
        const verificationExpiry = new Date(Date.now() + VERIFY_TOKEN_EXPIRY_HOURS * 60 * 60 * 1000);

        await usersCollection.updateOne(
            { _id: user._id },
            { $set: { emailVerificationToken: verificationToken, emailVerificationExpiry: verificationExpiry } }
        );

        const appUrl = process.env.NEXT_PUBLIC_APP_URL || request.nextUrl.origin;
        const verifyUrl = `${appUrl}/auth/verify-email?token=${verificationToken}`;

        await sendEmail({
            to: email,
            subject: 'Your new WashWise verification link',
            html: buildVerificationEmailHtml(user.username || 'there', verifyUrl),
        });

        return NextResponse.json({ message: 'A new verification link has been sent to your email.' }, { status: 200 });

    } catch (error) {
        console.error('Error resending verification:', error);
        return NextResponse.json({ error: 'Internal server error.' }, { status: 500 });
    }
}
