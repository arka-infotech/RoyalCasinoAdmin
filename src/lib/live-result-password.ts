import pool from "@/lib/db";

const ROW_ID = 1;

export async function getLiveResultPasswordFromDb(): Promise<string | null> {
  const r = await pool.query<{ password: string }>(
    "SELECT password FROM admin_live_password WHERE id = $1",
    [ROW_ID]
  );
  return r.rows[0]?.password ?? null;
}

export function getLiveResultPasswordFromEnv(): string | null {
  const v = process.env.LIVERESULT_PASSWORD;
  if (v === undefined || v === "") return null;
  return v;
}

export async function isLiveResultPasswordConfigured(): Promise<boolean> {
  const fromDb = await getLiveResultPasswordFromDb();
  if (fromDb !== null) return true;
  return getLiveResultPasswordFromEnv() !== null;
}

/** Compare submitted password to DB row, or fall back to LIVERESULT_PASSWORD env when no row exists. */
export async function verifyLiveResultPassword(
  input: string
): Promise<boolean> {
  const stored = await getLiveResultPasswordFromDb();
  if (stored !== null) return input === stored;
  const env = getLiveResultPasswordFromEnv();
  if (env !== null) return input === env;
  return false;
}

/** Reset after verifying old password against DB or env (legacy migration). */
export async function updateLiveResultPassword(newPassword: string): Promise<void> {
  const existing = await getLiveResultPasswordFromDb();
  if (existing !== null) {
    await pool.query(
      "UPDATE admin_live_password SET password = $1 WHERE id = $2",
      [newPassword, ROW_ID]
    );
    return;
  }
  await pool.query(
    "INSERT INTO admin_live_password (id, password) VALUES ($1, $2)",
    [ROW_ID, newPassword]
  );
}
