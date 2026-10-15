-- ==============================================================================
-- Hand Cricket Omegle — Safety, Moderation, Reports, Bans & Blocks
-- Migration: 20261015000000_safety_and_reports.sql
-- ==============================================================================

-- 1. Reports Table (Zero video/snapshot storage; metadata only)
CREATE TABLE IF NOT EXISTS public.reports (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    reporter_guest_id TEXT NOT NULL,
    reported_guest_id TEXT NOT NULL,
    room_id TEXT NOT NULL,
    reason TEXT NOT NULL,
    status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'dismissed', 'actioned')),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL
);

-- Index for speedy reporter / reported lookups and moderation queries
CREATE INDEX IF NOT EXISTS idx_reports_reported ON public.reports (reported_guest_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_reports_status ON public.reports (status, created_at DESC);

-- Enable Row Level Security (RLS) on reports
ALTER TABLE public.reports ENABLE ROW LEVEL SECURITY;

-- Clients can insert a report (anonymous guests reporting fair-play violations)
CREATE POLICY "Allow guests to submit reports"
    ON public.reports
    FOR INSERT
    TO anon, authenticated
    WITH CHECK (
        char_length(reason) >= 1 AND
        char_length(reason) <= 500 AND
        reporter_guest_id <> reported_guest_id
    );

-- Only admins can view reports (JWT claim role = 'admin' or service_role)
CREATE POLICY "Admins can select reports"
    ON public.reports
    FOR SELECT
    TO authenticated, service_role
    USING (
        (auth.jwt() ->> 'role') = 'admin' OR
        (auth.jwt() -> 'app_metadata' ->> 'role') = 'admin' OR
        (auth.jwt() -> 'user_metadata' ->> 'role') = 'admin'
    );

-- Only admins can update report status (e.g., dismiss or action)
CREATE POLICY "Admins can update reports"
    ON public.reports
    FOR UPDATE
    TO authenticated, service_role
    USING (
        (auth.jwt() ->> 'role') = 'admin' OR
        (auth.jwt() -> 'app_metadata' ->> 'role') = 'admin' OR
        (auth.jwt() -> 'user_metadata' ->> 'role') = 'admin'
    )
    WITH CHECK (
        (auth.jwt() ->> 'role') = 'admin' OR
        (auth.jwt() -> 'app_metadata' ->> 'role') = 'admin' OR
        (auth.jwt() -> 'user_metadata' ->> 'role') = 'admin'
    );


-- 2. Bans Table (Auto-bans and Admin Bans)
CREATE TABLE IF NOT EXISTS public.bans (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    target_id TEXT NOT NULL, -- guestId or salted hashedIp
    ban_type TEXT NOT NULL CHECK (ban_type IN ('temp_24h', 'permanent')),
    reason TEXT NOT NULL,
    banned_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL,
    expires_at TIMESTAMP WITH TIME ZONE -- NULL represents permanent ban
);

CREATE INDEX IF NOT EXISTS idx_bans_target ON public.bans (target_id);
CREATE INDEX IF NOT EXISTS idx_bans_expires ON public.bans (expires_at);

ALTER TABLE public.bans ENABLE ROW LEVEL SECURITY;

-- Anyone can check active ban status by target_id
CREATE POLICY "Public check active ban status"
    ON public.bans
    FOR SELECT
    TO anon, authenticated
    USING (expires_at IS NULL OR expires_at > NOW());

-- Only admins and service role can insert or modify bans
CREATE POLICY "Admins can manage bans"
    ON public.bans
    FOR ALL
    TO authenticated, service_role
    USING (
        (auth.jwt() ->> 'role') = 'admin' OR
        (auth.jwt() -> 'app_metadata' ->> 'role') = 'admin' OR
        (auth.jwt() -> 'user_metadata' ->> 'role') = 'admin'
    );


-- 3. Blocks Table (Pairwise blocklist so blocked players are never matched)
CREATE TABLE IF NOT EXISTS public.blocks (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    blocker_id TEXT NOT NULL,
    blocked_id TEXT NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL,
    CONSTRAINT unique_block_pair UNIQUE (blocker_id, blocked_id)
);

CREATE INDEX IF NOT EXISTS idx_blocks_blocker ON public.blocks (blocker_id);
CREATE INDEX IF NOT EXISTS idx_blocks_blocked ON public.blocks (blocked_id);

ALTER TABLE public.blocks ENABLE ROW LEVEL SECURITY;

-- Guests can insert a block against an opponent
CREATE POLICY "Allow guests to insert blocks"
    ON public.blocks
    FOR INSERT
    TO anon, authenticated
    WITH CHECK (blocker_id <> blocked_id);

-- Guests can read their own blocks
CREATE POLICY "Allow guests to read their own blocks"
    ON public.blocks
    FOR SELECT
    TO anon, authenticated
    USING (blocker_id = COALESCE(auth.uid()::text, blocker_id));
