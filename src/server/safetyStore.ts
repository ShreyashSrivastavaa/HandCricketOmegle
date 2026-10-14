import crypto from "crypto";

export interface ReportRecord {
  id: string;
  reporterGuestId: string;
  reportedGuestId: string;
  roomId: string;
  reason: string;
  snapshotBase64?: string;
  hashedIp: string;
  createdAt: number;
  status: "pending" | "dismissed" | "actioned";
}

export interface BanRecord {
  target: string; // guestId or hashedIp
  type: "temp_24h" | "permanent";
  reason: string;
  bannedAt: number;
  expiresAt: number | null; // null for permanent
}

const SALT = process.env.IP_SALT || "hand_cricket_safety_salt_2026";

/**
 * Anonymizes an IP address with salted SHA-256 hash. Never stores raw IP.
 */
export function hashIp(ip: string): string {
  return crypto.createHash("sha256").update(`${ip}:${SALT}`).digest("hex");
}

class SafetyStore {
  private reports: ReportRecord[] = [];
  private bans: Map<string, BanRecord> = new Map();

  /**
   * Submit a new player report.
   * If a guest receives 3 distinct reports within 24 hours, automatically triggers a 24-hour temp ban.
   */
  public addReport(params: {
    reporterGuestId: string;
    reportedGuestId: string;
    roomId: string;
    reason: string;
    snapshotBase64?: string;
    ip: string;
  }): { report: ReportRecord; autoBanned: boolean } {
    const hashedIp = hashIp(params.ip);
    const now = Date.now();

    const report: ReportRecord = {
      id: `rep_${now}_${Math.random().toString(36).substring(2, 7)}`,
      reporterGuestId: params.reporterGuestId,
      reportedGuestId: params.reportedGuestId,
      roomId: params.roomId,
      reason: params.reason,
      snapshotBase64: params.snapshotBase64,
      hashedIp,
      createdAt: now,
      status: "pending",
    };

    this.reports.push(report);

    // Auto-prune reports older than 30 days
    this.pruneOldReports();

    // Check for 3 distinct reports within last 24h for reportedGuestId
    const oneDayAgo = now - 24 * 60 * 60 * 1000;
    const recentReports = this.reports.filter(
      (r) =>
        r.reportedGuestId === params.reportedGuestId &&
        r.createdAt >= oneDayAgo &&
        r.status !== "dismissed"
    );

    const distinctReporters = new Set(recentReports.map((r) => r.reporterGuestId));
    let autoBanned = false;

    if (distinctReporters.size >= 3) {
      // 3 distinct reports in 24h -> apply automatic 24-hour ban
      this.banGuest(params.reportedGuestId, "temp_24h", "Automatic suspension: 3 user reports in 24h", hashedIp);
      autoBanned = true;
    }

    return { report, autoBanned };
  }

  /**
   * Ban a guest (24h or permanent)
   */
  public banGuest(
    guestId: string,
    type: "temp_24h" | "permanent",
    reason: string,
    hashedIp?: string
  ): void {
    const now = Date.now();
    const expiresAt = type === "temp_24h" ? now + 24 * 60 * 60 * 1000 : null;

    const banRecord: BanRecord = {
      target: guestId,
      type,
      reason,
      bannedAt: now,
      expiresAt,
    };

    this.bans.set(guestId, banRecord);

    if (hashedIp) {
      this.bans.set(hashedIp, {
        ...banRecord,
        target: hashedIp,
      });
    }
  }

  /**
   * Check if a guest or IP is currently banned
   */
  public isBanned(guestId: string, ip?: string): { banned: boolean; ban?: BanRecord } {
    const now = Date.now();

    // Check guest ID
    const guestBan = this.bans.get(guestId);
    if (guestBan) {
      if (guestBan.expiresAt === null || guestBan.expiresAt > now) {
        return { banned: true, ban: guestBan };
      }
      this.bans.delete(guestId);
    }

    // Check hashed IP
    if (ip) {
      const hIp = hashIp(ip);
      const ipBan = this.bans.get(hIp);
      if (ipBan) {
        if (ipBan.expiresAt === null || ipBan.expiresAt > now) {
          return { banned: true, ban: ipBan };
        }
        this.bans.delete(hIp);
      }
    }

    return { banned: false };
  }

  /**
   * Admin actions on reports
   */
  public actionReport(
    reportId: string,
    action: "dismiss" | "warn" | "ban24h" | "banPermanent"
  ): { success: boolean; message: string } {
    const report = this.reports.find((r) => r.id === reportId);
    if (!report) {
      return { success: false, message: "Report not found" };
    }

    if (action === "dismiss") {
      report.status = "dismissed";
      return { success: true, message: "Report dismissed" };
    }

    report.status = "actioned";

    if (action === "ban24h") {
      this.banGuest(report.reportedGuestId, "temp_24h", `Admin ban: ${report.reason}`, report.hashedIp);
      return { success: true, message: "Target guest banned for 24 hours" };
    }

    if (action === "banPermanent") {
      this.banGuest(report.reportedGuestId, "permanent", `Admin permanent ban: ${report.reason}`, report.hashedIp);
      return { success: true, message: "Target guest permanently banned" };
    }

    return { success: true, message: "Report actioned with warning" };
  }

  /**
   * List reports for admin review
   */
  public getReports(): ReportRecord[] {
    return [...this.reports].reverse();
  }

  /**
   * Get active ban count
   */
  public getStats(): { totalReports: number; activeBans: number } {
    let activeBans = 0;
    const now = Date.now();
    for (const ban of this.bans.values()) {
      if (ban.expiresAt === null || ban.expiresAt > now) {
        activeBans++;
      }
    }
    return {
      totalReports: this.reports.length,
      activeBans,
    };
  }

  /**
   * Prunes snapshots and reports older than 30 days
   */
  public pruneOldReports(): void {
    const thirtyDaysAgo = Date.now() - 30 * 24 * 60 * 60 * 1000;
    this.reports = this.reports.filter((r) => r.createdAt >= thirtyDaysAgo);
  }

  /**
   * Reset store (for unit tests)
   */
  public clear(): void {
    this.reports = [];
    this.bans.clear();
  }
}

export const safetyStore = new SafetyStore();
