import { NextResponse } from "next/server";
import {
  isLiveResultPasswordConfigured,
  updateLiveResultPassword,
  verifyLiveResultPassword,
} from "@/lib/live-result-password";
import { getAdminFromCookies } from "@/lib/auth";
import { recordPanelActivity } from "@/lib/activityLog";

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const oldPassword = typeof body.oldPassword === "string" ? body.oldPassword : "";
    const newPassword = typeof body.newPassword === "string" ? body.newPassword : "";
    const confirmPassword =
      typeof body.confirmPassword === "string" ? body.confirmPassword : "";

    if (!(await isLiveResultPasswordConfigured())) {
      return NextResponse.json(
        { ok: false, message: "Password not configured" },
        { status: 500 }
      );
    }

    if (!newPassword.trim()) {
      return NextResponse.json(
        { ok: false, message: "New password is required" },
        { status: 400 }
      );
    }

    if (newPassword !== confirmPassword) {
      return NextResponse.json(
        { ok: false, message: "New password and confirmation do not match" },
        { status: 400 }
      );
    }

    const oldOk = await verifyLiveResultPassword(oldPassword);
    if (!oldOk) {
      return NextResponse.json(
        { ok: false, message: "Current password is incorrect" },
        { status: 401 }
      );
    }

    await updateLiveResultPassword(newPassword);

    const admin = await getAdminFromCookies();
    if (admin) {
      await recordPanelActivity(`${admin.username} changed the live-result password`, {
        targetType: 'live-result',
      });
    }

    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json(
      { ok: false, message: "Invalid request" },
      { status: 400 }
    );
  }
}
