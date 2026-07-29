import { ImageResponse } from "next/og";

export const size = {
  width: 32,
  height: 32,
};

export const contentType = "image/png";

/**
 * Browser icons cannot render the HTML/CSS used by LogoMark directly, so this
 * recreates its three-tile mark as a generated PNG.
 */
export default function Icon() {
  const tile = {
    position: "absolute" as const,
    width: 12,
    height: 12,
    borderRadius: 3,
  };

  return new ImageResponse(
    <div
      style={{
        background: "#111827",
        display: "flex",
        height: "100%",
        position: "relative",
        width: "100%",
      }}
    >
      <div
        style={{
          ...tile,
          background: "#818cf8",
          boxShadow: "0 2px 6px rgb(129 140 248 / 45%)",
          left: 4,
          top: 4,
        }}
      />
      <div
        style={{
          ...tile,
          background: "#38bdf8",
          boxShadow: "0 2px 6px rgb(56 189 248 / 35%)",
          right: 4,
          top: 10,
        }}
      />
      <div
        style={{
          ...tile,
          background: "#8b5cf6",
          bottom: 4,
          boxShadow: "0 2px 6px rgb(139 92 246 / 35%)",
          left: 10,
        }}
      />
    </div>,
    size,
  );
}
