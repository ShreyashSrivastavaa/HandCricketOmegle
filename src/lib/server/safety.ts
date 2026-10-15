import crypto from "crypto";
import { getRedis } from "./redis";

export interface ReportRecord {
  id: string;
  reporterGuestId: string;
  reportedGuestId: string;
  roomId: string;
  reason: string;
  hashedIp?: string;
  createdAt: number;
  status: "pending" | "dismissed" | "actioned";
}

export interface BanInfo {
  target: string;
  type: "temp_24h" | "permanent";
  reason: string;
  bannedAt: number;
  expiresAt: number | null;
}

const SALT = process.env.IP_SALT || "hand_cricket_safety_salt_2026";

/**
 * Anonymizes an IP address with salted SHA-256 hash. Never stores raw IP.
 */
export function hashIp(ip: string): string {
  return crypto.createHash("sha256").update(`${ip}:${SALT}`).digest("hex");
}

/**
 * Submits a new player report.
 * Strictly adheres to ZERO video/snapshot storage rule: records metadata only.
 * If 3 distinct reporters report the same player within 24 hours, automatically
 * triggers a 24-hour temporary matchmaking cooldown.
 */
export async function recordReport(params: {
  reporterGuestId: string;
  reportedGuestId: string;
  roomId: string;
  reason: string;
  ip?: string;
  blockOpponent?: boolean;
}): Promise<{ success: boolean; autoBanned: boolean; reportId: string }> {
  const redis = getRedis();
  const now = Date.now();
  const reportId = `rep_${now}_${Math.random().toString(36).substring(2, 7)}`;
  const hashedIp = params.ip ? hashIp(params.ip) : undefined;

  const report: ReportRecord = {
    id: reportId,
    reporterGuestId: params.reporterGuestId,
    reportedGuestId: params.reportedGuestId,
    roomId: params.roomId,
    reason: params.reason.slice(0, 500),
    hashedIp,
    createdAt: now,
    status: "pending",
  };

  // 1. Store report in Redis list (capped at 500 latest entries)
  try {
    await redis.lpush("reports:hand_cricket", JSON.stringify(report));
    await redis.ltrim("reports:hand_cricket", 0, 499);
  } catch (err) {
    console.warn("[Safety] Failed to push report to redis list:", err);
  }

  // 2. Track distinct reporters within 24h rolling window
  let autoBanned = false;
  if (params.reportedGuestId && params.reporterGuestId !== params.reportedGuestId) {
    const reportersKey = `reports:reporters:${params.reportedGuestId}`;
    try {
      await redis.sadd(reportersKey, params.reporterGuestId);
      await redis.expire(reportersKey, 86400); // 24 hours

      // Check distinct count
      const count = await redis.scard(reportersKey);
      if (count >= 3) {
        // Threshold reached: apply automatic 24-hour ban
        await banGuest(
          params.reportedGuestId,
          "temp_24h",
          "Automatic temporary cooldown: 3 community reports within 24h"
        );
        if (hashedIp) {
          await banGuest(
            hashedIp,
            "temp_24h",
            "Automatic temporary cooldown: 3 community reports within 24h",
            true
          );
        }
        autoBanned = true;
      }
    } catch (err) {
      console.warn("[Safety] Auto-ban escalation check failed:", err);
    }
  }

  // 3. Handle immediate block if requested
  if (params.blockOpponent && params.reporterGuestId && params.reportedGuestId) {
    await blockGuest(params.reporterGuestId, params.reportedGuestId);
  }

  // 4. Mirror to Supabase if configured
  mirrorReportToSupabase(report, autoBanned).catch(() => {});

  return { success: true, autoBanned, reportId };
}

/**
 * Blocks an opponent so the blocker is never matched with them again.
 * Stored with a 30-day TTL in Redis.
 */
export async function blockGuest(
  blockerId: string,
  blockedId: string
): Promise<void> {
  if (!blockerId || !blockedId || blockerId === blockedId) return;

  const redis = getRedis();
  const blockKey = `blocks:${blockerId}`;
  try {
    await redis.sadd(blockKey, blockedId);
    await redis.expire(blockKey, 30 * 24 * 60 * 60); // 30 days
  } catch (err) {
    console.warn("[Safety] Failed to record block in redis:", err);
  }
}

/**
 * Checks whether either guest in a pair has blocked the other.
 */
export async function isOpponentBlocked(
  guestA: string,
  guestB: string
): Promise<boolean> {
  if (!guestA || !guestB) return false;
  const redis = getRedis();

  try {
    const [aBlockedB, bBlockedA] = await Promise.all([
      redis.sismember(`blocks:${guestA}`, guestB),
      redis.sismember(`blocks:${guestB}`, guestA),
    ]);
    return Boolean(aBlockedB || bBlockedA);
  } catch {
    return false;
  }
}

/**
 * Checks if a guestId or hashed IP is currently banned.
 */
export async function isGuestBanned(
  guestId: string,
  ip?: string
): Promise<{ banned: boolean; ban?: BanInfo }> {
  const redis = getRedis();
  const now = Date.now();

  try {
    // Check guest ID
    const guestBanRaw = await redis.get<string | BanInfo>(`ban:${guestId}`);
    if (guestBanRaw) {
      const ban: BanInfo =
        typeof guestBanRaw === "string" ? JSON.parse(guestBanRaw) : guestBanRaw;
      if (ban.expiresAt === null || ban.expiresAt > now) {
        return { banned: true, ban };
      }
      // Ban expired
      await redis.del(`ban:${guestId}`);
    }

    // Check hashed IP
    if (ip) {
      const hIp = hashIp(ip);
      const ipBanRaw = await redis.get<string | BanInfo>(`ban:ip:${hIp}`);
      if (ipBanRaw) {
        const ban: BanInfo =
          typeof ipBanRaw === "string" ? JSON.parse(ipBanRaw) : ipBanRaw;
        if (ban.expiresAt === null || ban.expiresAt > now) {
          return { banned: true, ban };
        }
        await redis.del(`ban:ip:${hIp}`);
      }
    }
  } catch (err) {
    console.warn("[Safety] Ban check error:", err);
  }

  return { banned: false };
}

/**
 * Sets a temporary or permanent ban for a guest or IP hash.
 */
export async function banGuest(
  target: string,
  type: "temp_24h" | "permanent",
  reason: string,
  isIp = false
): Promise<void> {
  const redis = getRedis();
  const now = Date.now();
  const expiresAt = type === "temp_24h" ? now + 24 * 60 * 60 * 1000 : null;

  const banRecord: BanInfo = {
    target,
    type,
    reason,
    bannedAt: now,
    expiresAt,
  };

  const key = isIp ? `ban:ip:${target}` : `ban:${target}`;
  const serialized = JSON.stringify(banRecord);

  try {
    if (type === "temp_24h") {
      await redis.set(key, serialized, { ex: 86400 });
    } else {
      await redis.set(key, serialized);
    }
  } catch (err) {
    console.warn("[Safety] Failed to set ban in redis:", err);
  }
}

/**
 * Lists reports for admin moderation review.
 */
export async function listReports(limit = 50): Promise<ReportRecord[]> {
  const redis = getRedis();
  try {
    const raw = await redis.lrange("reports:hand_cricket", 0, limit - 1);
    const reports: ReportRecord[] = [];
    for (const item of raw) {
      try {
        reports.push(typeof item === "string" ? JSON.parse(item) : item);
      } catch {}
    }
    return reports;
  } catch (err) {
    console.warn("[Safety] Failed to list reports:", err);
    return [];
  }
}

/**
 * Admin action on a report.
 */
export async function handleReportAction(
  reportId: string,
  action: "dismiss" | "ban24h" | "banPermanent"
): Promise<{ success: boolean; message: string }> {
  const redis = getRedis();

  try {
    const raw = await redis.lrange("reports:hand_cricket", 0, 100);
    let targetReport: ReportRecord | null = null;
    let targetIndex = -1;

    for (let i = 0; i < raw.length; i++) {
      const item = raw[i];
      const parsed = typeof item === "string" ? JSON.parse(item) : (item as any);
      if (parsed?.id === reportId) {
        targetReport = parsed;
        targetIndex = i;
        break;
      }
    }

    if (!targetReport) {
      return { success: false, message: "Report not found" };
    }

    if (action === "dismiss") {
      targetReport.status = "dismissed";
      await redis.lset("reports:hand_cricket", targetIndex, JSON.stringify(targetReport));
      return { success: true, message: "Report dismissed" };
    }

    if (action === "ban24h" || action === "banPermanent") {
      targetReport.status = "actioned";
      await redis.lset("reports:hand_cricket", targetIndex, JSON.stringify(targetReport));

      const banType = action === "ban24h" ? "temp_24h" : "permanent";
      await banGuest(
        targetReport.reportedGuestId,
        banType,
        `Admin action on report ${reportId}: ${targetReport.reason}`
      );
      if (targetReport.hashedIp) {
        await banGuest(
          targetReport.hashedIp,
          banType,
          `Admin action on report ${reportId}: ${targetReport.reason}`,
          true
        );
      }
      return { success: true, message: `Guest ${targetReport.reportedGuestId} banned (${banType})` };
    }

    return { success: false, message: "Unknown action" };
  } catch (err: any) {
    return { success: false, message: err.message || "Failed to process action" };
  }
}

/**
 * Optional background mirror to Supabase database if credentials exist.
 */
async function mirrorReportToSupabase(
  report: ReportRecord,
  autoBanned: boolean
): Promise<void> {
  const supabaseUrl = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!supabaseUrl || !serviceRoleKey) return;

  try {
    await fetch(`${supabaseUrl}/rest/v1/reports`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        apikey: serviceRoleKey,
        Authorization: `Bearer ${serviceRoleKey}`,
      },
      body: JSON.stringify({
        reporter_guest_id: report.reporterGuestId,
        reported_guest_id: report.reportedGuestId,
        room_id: report.roomId,
        reason: report.reason,
        status: report.status,
      }),
    });

    if (autoBanned) {
      const expiresAt = new Date(Date.now() + 86400000).toISOString();
      await fetch(`${supabaseUrl}/rest/v1/bans`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          apikey: serviceRoleKey,
          Authorization: `Bearer ${serviceRoleKey}`,
        },
        body: JSON.stringify({
          target_id: report.reportedGuestId,
          target_ip_hash: report.hashedIp,
          ban_type: "temp_24h",
          reason: "Automatic suspension: 3 community reports in 24h",
          expires_at: expiresAt,
        }),
      });
    }
  } catch {}
}
