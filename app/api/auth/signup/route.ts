import { randomBytes } from 'node:crypto';
import { NextRequest, NextResponse } from 'next/server';
import bcrypt from 'bcrypt';
import { getDb } from '../../../config/mongodb';
import { sendEmail } from '../../../lib/email';

export const runtime = 'nodejs';

const VERIFY_TOKEN_EXPIRY_HOURS = 24;

function generateVerificationToken(): string {
    return randomBytes(32).toString('hex');
}

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
          <h1 style="margin:0;color:#ffffff;font-size:26px;font-weight:800;letter-spacing:-0.5px;">WashWise</h1>
          <p style="margin:8px 0 0;color:rgba(255,255,255,0.85);font-size:14px;">Laundry, made effortless.</p>
        </td></tr>
        <tr><td style="padding:40px 36px;">
          <h2 style="margin:0 0 12px;color:#0f172a;font-size:20px;font-weight:700;">Verify your email address</h2>
          <p style="margin:0 0 24px;color:#475569;font-size:15px;line-height:1.6;">Hi <strong>${username}</strong>, thanks for signing up! Click the button below to verify your email and activate your account.</p>
          <div style="text-align:center;margin:32px 0;">
            <a href="${verifyUrl}" style="background:linear-gradient(135deg,#11998e,#38ef7d);color:#ffffff;text-decoration:none;padding:14px 36px;border-radius:8px;font-size:15px;font-weight:700;display:inline-block;">Verify Email Address</a>
          </div>
          <p style="margin:0 0 8px;color:#94a3b8;font-size:13px;">This link expires in <strong>24 hours</strong>. If you did not create an account, you can safely ignore this email.</p>
          <p style="margin:0;color:#94a3b8;font-size:12px;word-break:break-all;">Or paste this URL: ${verifyUrl}</p>
        </td></tr>
        <tr><td style="background:#f8fafc;padding:20px 36px;text-align:center;border-top:1px solid #e2e8f0;">
          <p style="margin:0;color:#94a3b8;font-size:12px;">&copy; ${new Date().getFullYear()} WashWise Laundry Services &middot; Olongapo City, Philippines</p>
        </td></tr>
      </table>
    </td></tr>
  </table>
</body>
</html>`;
}

export async function POST(request: NextRequest) {
    const { email, username, address, contactNo, password, confirmPass } = await request.json();

    if (!email || !username || !address || !contactNo || !password || !confirmPass) {
        return NextResponse.json({ error: 'All fields are required.' }, { status: 400 });
    }

    if (password !== confirmPass) {
        return NextResponse.json({ error: 'Passwords do not match.' }, { status: 400 });
    }

    try {
        const db = await getDb();
        const usersCollection = db.collection('users');
        const existingUser = await usersCollection.findOne({ email });
        const existingUsername = await usersCollection.findOne({ username });

        if (existingUsername) {
            return NextResponse.json({ error: 'Username already in use.' }, { status: 400 });
        }

        if (existingUser) {
            return NextResponse.json({ error: 'Email already in use.' }, { status: 400 });
        }

        const hashedPassword = await bcrypt.hash(password, 10);
        const verificationToken = generateVerificationToken();
        const verificationExpiry = new Date(Date.now() + VERIFY_TOKEN_EXPIRY_HOURS * 60 * 60 * 1000);

        const newUser = {
            email,
            username,
            address,
            contactNo,
            role: 'member',
            password: hashedPassword,
            isVerified: false,
            emailVerificationToken: verificationToken,
            emailVerificationExpiry: verificationExpiry,
            createdAt: new Date(),
        };

        await usersCollection.insertOne(newUser);

		// Record activity
		const { recordActivity } = await import('../../../lib/logger');
		await recordActivity({
			type: "user-signup",
			customerName: username,
			performedBy: "Customer",
			details: `New account created for ${email}.`
		});

        // Build and send verification email
        const appUrl = process.env.NEXT_PUBLIC_APP_URL || request.nextUrl.origin;
        const verifyUrl = `${appUrl}/auth/verify-email?token=${verificationToken}`;

        await sendEmail({
            to: email,
            subject: 'Verify your WashWise account',
            html: buildVerificationEmailHtml(username, verifyUrl),
        });

        return NextResponse.json(
            { message: 'Account created. Please check your email to verify your account.', email },
            { status: 201 }
        );

    } catch (error) {
        console.error('Error during signup:', error);
        return NextResponse.json({ error: 'Internal server error.' }, { status: 500 });
    }
}