import { NextResponse } from "next/server";
import {
  isLiveResultPasswordConfigured,
  verifyLiveResultPassword,
} from "@/lib/live-result-password";

export async function POST(request: Request) {
  try {
    const { password } = await request.json();

    if (!(await isLiveResultPasswordConfigured())) {
      return NextResponse.json(
        { ok: false, message: "Password not configured" },
        { status: 500 }
      );
    }

    const isValid = await verifyLiveResultPassword(password);

    return NextResponse.json(
      { ok: isValid },
      { status: isValid ? 200 : 401 }
    );
  } catch {
    return NextResponse.json(
      { ok: false, message: "Invalid request" },
      { status: 400 }
    );
  }
}

