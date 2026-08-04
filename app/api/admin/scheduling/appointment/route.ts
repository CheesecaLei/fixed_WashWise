import { NextRequest, NextResponse } from "next/server";

export async function GET(_request: NextRequest) {
    return NextResponse.json({ message: "Not implemented" }, { status: 501 });
}
