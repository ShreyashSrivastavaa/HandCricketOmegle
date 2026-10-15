import { ImageResponse } from "next/og";

export const runtime = "edge";
export const alt = "HandCricketOmegle - Real-Time 1v1 Stranger Hand Cricket Arena";
export const size = {
  width: 1200,
  height: 630,
};
export const contentType = "image/png";

export default function Image() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          backgroundColor: "#0B1210",
          backgroundImage: "radial-gradient(circle at 50% 30%, rgba(61,220,132,0.18) 0%, rgba(11,18,16,0.98) 75%)",
          color: "#F0F4F2",
          fontFamily: "sans-serif",
          padding: "60px",
          border: "12px solid #141E1B",
          position: "relative",
        }}
      >
        {/* Subtle decorative grid lines */}
        <div
          style={{
            position: "absolute",
            inset: 0,
            border: "2px solid rgba(61,220,132,0.25)",
            margin: "24px",
            borderRadius: "24px",
            display: "flex",
          }}
        />

        {/* Top Badge */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: "12px",
            padding: "10px 24px",
            borderRadius: "999px",
            backgroundColor: "rgba(61,220,132,0.12)",
            border: "1.5px solid rgba(61,220,132,0.4)",
            marginBottom: "28px",
          }}
        >
          <span style={{ fontSize: "28px" }}>🏏</span>
          <span
            style={{
              fontSize: "18px",
              fontWeight: 800,
              letterSpacing: "0.15em",
              color: "#3DDC84",
              textTransform: "uppercase",
            }}
          >
            Real-Time Stranger Matchmaking
          </span>
        </div>

        {/* Main Headline */}
        <h1
          style={{
            fontSize: "68px",
            fontWeight: 900,
            letterSpacing: "-0.02em",
            textAlign: "center",
            margin: 0,
            lineHeight: 1.1,
            textTransform: "uppercase",
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
          }}
        >
          <span>HAND CRICKET</span>
          <span style={{ color: "#3DDC84" }}>OMEGLE</span>
        </h1>

        {/* Tagline */}
        <p
          style={{
            fontSize: "24px",
            color: "#8FA39A",
            textAlign: "center",
            maxWidth: "800px",
            marginTop: "20px",
            marginBottom: "36px",
            lineHeight: 1.4,
          }}
        >
          The nostalgic Indian schoolyard game, now online! Anonymous 1v1 duels, instant reveal animations, and zero servers.
        </p>

        {/* Feature Pill Highlights */}
        <div
          style={{
            display: "flex",
            gap: "24px",
            alignItems: "center",
          }}
        >
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: "8px",
              padding: "10px 20px",
              borderRadius: "12px",
              backgroundColor: "#141E1B",
              border: "1px solid #1F2E29",
              fontSize: "16px",
              fontWeight: 700,
              color: "#3DDC84",
            }}
          >
            ✓ P2P Video WebRTC
          </div>
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: "8px",
              padding: "10px 20px",
              borderRadius: "12px",
              backgroundColor: "#141E1B",
              border: "1px solid #1F2E29",
              fontSize: "16px",
              fontWeight: 700,
              color: "#FFB84D",
            }}
          >
            ⚡ 10s Turn Limit
          </div>
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: "8px",
              padding: "10px 20px",
              borderRadius: "12px",
              backgroundColor: "#141E1B",
              border: "1px solid #1F2E29",
              fontSize: "16px",
              fontWeight: 700,
              color: "#4DA8DA",
            }}
          >
            🛡️ Server Authoritative
          </div>
        </div>
      </div>
    ),
    {
      ...size,
    }
  );
}
