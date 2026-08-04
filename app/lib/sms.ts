import 'server-only';

const SMS_API_URL = 'https://smsapiph.onrender.com/api/v1/send/sms';

/**
 * Normalizes a Philippine phone number to the E.164 format (+639XXXXXXXXX).
 * Handles: 09XXXXXXXXX, 639XXXXXXXXX, +639XXXXXXXXX, or already formatted numbers.
 * Returns null if the number cannot be normalized.
 */
export function normalizePHPhoneNumber(number: string | undefined | null): string | null {
  if (!number) return null;

  const cleaned = number.replace(/[\s\-().]/g, '');

  // Already in +63 format
  if (/^\+639\d{9}$/.test(cleaned)) return cleaned;

  // 639XXXXXXXXX (without +)
  if (/^639\d{9}$/.test(cleaned)) return `+${cleaned}`;

  // 09XXXXXXXXX (local format)
  if (/^09\d{9}$/.test(cleaned)) return `+63${cleaned.slice(1)}`;

  // 9XXXXXXXXX (without leading 0)
  if (/^9\d{9}$/.test(cleaned)) return `+63${cleaned}`;

  console.warn(`[SMS] Cannot normalize phone number: ${number}`);
  return null;
}

/**
 * Sends a single SMS to a Philippine mobile number via SMS API PH.
 */
export async function sendSms(recipient: string, message: string): Promise<void> {
  const apiKey = process.env.SMS_API_KEY;
  if (!apiKey) {
    console.error('[SMS] SMS_API_KEY is not set in environment variables.');
    return;
  }

  const normalizedNumber = normalizePHPhoneNumber(recipient);
  if (!normalizedNumber) {
    console.warn(`[SMS] Skipping SMS — could not normalize number: ${recipient}`);
    return;
  }

  try {
    const res = await fetch(SMS_API_URL, {
      method: 'POST',
      headers: {
        'x-api-key': apiKey,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        recipient: normalizedNumber,
        message,
      }),
    });

    let data: unknown;
    try {
      data = await res.json();
    } catch {
      data = await res.text();
    }

    if (!res.ok) {
      console.error(`[SMS] ❌ Failed (${res.status}) to ${normalizedNumber}:`, JSON.stringify(data));
    } else {
      console.log(`[SMS] ✅ API response for ${normalizedNumber} (${res.status}):`, JSON.stringify(data));
    }
  } catch (error) {
    console.error(`[SMS] 🔴 Network error sending to ${normalizedNumber}:`, error);
  }
}

/**
 * Sends an SMS to multiple recipients.
 * Silently skips recipients with missing or unnormalizable numbers.
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export async function broadcastSms(contacts: any[], message: string): Promise<void> {
  if (!contacts || contacts.length === 0) return;

  const results = await Promise.allSettled(
    contacts
      .filter((c) => normalizePHPhoneNumber(c?.contactNo))
      .map((c) => sendSms(c.contactNo as string, message))
  );

  const failed = results.filter((r) => r.status === 'rejected');
  if (failed.length > 0) {
    console.warn(`[SMS] ${failed.length} SMS(es) failed to send.`);
  }
}