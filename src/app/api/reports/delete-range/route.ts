import { NextResponse } from "next/server";
import pool from "@/lib/db";
import { getAdminFromCookies } from "@/lib/auth";
import { buildSubtreeFilter } from "@/lib/hierarchy";

type DeleteTarget = "wallet" | "history" | "turnover";
type DeleteMode = "preview" | "delete";

type DeleteRangeBody = {
  target?: DeleteTarget;
  mode?: DeleteMode;
  from?: string;
  to?: string;
  userId?: string;
  gameType?: string;
  confirmToken?: string;
};

function normalizeStart(v: string) {
  if (/^\d{4}-\d{2}-\d{2}$/.test(v)) return `${v} 00:00:00`;
  return v;
}

function normalizeEnd(v: string) {
  if (/^\d{4}-\d{2}-\d{2}$/.test(v)) return `${v} 23:59:59`;
  return v;
}

function makeToken(input: { target: DeleteTarget; from: string; to: string; count: number; userId?: string; gameType?: string }) {
  return Buffer.from(
    JSON.stringify({
      t: input.target,
      f: input.from,
      to: input.to,
      c: input.count,
      u: input.userId ?? "",
      g: input.gameType ?? "",
    })
  ).toString("base64");
}

function isDeleteTarget(v: string): v is DeleteTarget {
  return v === "wallet" || v === "history" || v === "turnover";
}

export async function POST(req: Request) {
  try {
    const admin = await getAdminFromCookies();
    if (!admin) {
      return NextResponse.json({ success: false, message: "Unauthorized" }, { status: 401 });
    }

    const body = (await req.json()) as DeleteRangeBody;
    const target = String(body.target ?? "").trim();
    const mode = String(body.mode ?? "preview").trim() as DeleteMode;
    const fromRaw = String(body.from ?? "").trim();
    const toRaw = String(body.to ?? "").trim();
    const userId = String(body.userId ?? "").trim() || undefined;
    const gameType = String(body.gameType ?? "").trim() || undefined;
    const confirmToken = String(body.confirmToken ?? "").trim();

    if (!isDeleteTarget(target)) {
      return NextResponse.json({ success: false, message: "Invalid target" }, { status: 400 });
    }
    if (mode !== "preview" && mode !== "delete") {
      return NextResponse.json({ success: false, message: "Invalid mode" }, { status: 400 });
    }
    if (!fromRaw || !toRaw) {
      return NextResponse.json({ success: false, message: "from and to are required" }, { status: 400 });
    }

    const from = normalizeStart(fromRaw);
    const to = normalizeEnd(toRaw);

    const filter = buildSubtreeFilter(admin, 1);
    const params: unknown[] = filter ? [...filter.params] : [];
    let idx = filter ? filter.nextIdx : 1;
    const conditions: string[] = [];

    if (target === "wallet") {
      if (filter) conditions.push(`wl.user_id IN (${filter.inClause})`);
      conditions.push(`wl.created_at >= $${idx++}`);
      params.push(from);
      conditions.push(`wl.created_at <= $${idx++}`);
      params.push(to);
      if (userId) {
        conditions.push(`wl.user_id = $${idx++}`);
        params.push(userId);
      }
    } else {
      if (filter) conditions.push(`u.id IN (${filter.inClause})`);
      conditions.push(`u.role = 'retailer'`);
      conditions.push(`pb.created_at >= $${idx++}`);
      params.push(from);
      conditions.push(`pb.created_at <= $${idx++}`);
      params.push(to);
      if (userId) {
        conditions.push(`pb.user_id = $${idx++}`);
        params.push(userId);
      }
      if (gameType) {
        conditions.push(
          `EXISTS (SELECT 1 FROM game_rounds gr WHERE gr.id = pb.round_id AND gr.game_type = $${idx++})`
        );
        params.push(gameType);
      }
    }

    const where = conditions.length ? `WHERE ${conditions.join(" AND ")}` : "";
    const withClause = filter?.cte ?? "";

    const countQuery =
      target === "wallet"
        ? `${withClause} SELECT COUNT(*)::int AS cnt FROM wallet_log wl ${where}`
        : `${withClause} SELECT COUNT(*)::int AS cnt FROM player_bets pb JOIN users u ON u.id = pb.user_id ${where}`;

    const countResult = await pool.query<{ cnt: number }>(countQuery, params);
    const previewCount = Number(countResult.rows[0]?.cnt ?? 0);
    const expectedToken = makeToken({ target, from, to, count: previewCount, userId, gameType });

    if (mode === "preview") {
      return NextResponse.json({
        success: true,
        data: {
          target,
          from,
          to,
          previewCount,
          confirmToken: expectedToken,
          requiresConfirmation: previewCount > 0,
          message: previewCount > 0 ? `This will delete ${previewCount} records.` : "No records found for this range.",
        },
      });
    }

    if (!confirmToken || confirmToken !== expectedToken) {
      return NextResponse.json(
        {
          success: false,
          message: "Confirmation required. Please preview again and confirm with latest token.",
          data: { previewCount, confirmToken: expectedToken },
        },
        { status: 409 }
      );
    }

    const deleteQuery =
      target === "wallet"
        ? `${withClause} DELETE FROM wallet_log wl ${where}`
        : `${withClause} DELETE FROM player_bets pb USING users u WHERE u.id = pb.user_id AND ${conditions.join(" AND ")}`;

    const delResult = await pool.query(deleteQuery, params);
    const deletedCount = delResult.rowCount ?? 0;

    return NextResponse.json({
      success: true,
      data: {
        target,
        from,
        to,
        previewCount,
        deletedCount,
        message:
          deletedCount > 0
            ? `Deleted ${deletedCount} records from ${target}.`
            : `No records deleted for ${target}.`,
      },
    });
  } catch (error) {
    console.error("Delete range API error:", error);
    return NextResponse.json({ success: false, message: "Server error" }, { status: 500 });
  }
}
