import { NextResponse } from 'next/server';

export const runtime = 'nodejs';

const SESSION_COOKIE_NAME = 'washwise_session';

export async function POST() {
	const response = NextResponse.json(
		{
			message: 'Logout successful.',
		},
		{ status: 200 },
	);

	response.cookies.set(SESSION_COOKIE_NAME, '', {
		httpOnly: true,
		secure: process.env.NODE_ENV === 'production',
		sameSite: 'lax',
		path: '/',
		maxAge: 0,
	});

	return response;
}
