import type { CSSProperties } from "react";

// Original inline vector artwork: no image requests or external asset dependencies.
const silhouettes: Record<string, string> = {
  car: "M4 14h2l3-6h11l4 6h3v8h-3a4 4 0 0 1-8 0h-4a4 4 0 0 1-8 0H3v-6q0-2 1-2Zm6-3-2 4h13l-3-4ZM8 20a2 2 0 1 0 0 4 2 2 0 0 0 0-4Zm12 0a2 2 0 1 0 0 4 2 2 0 0 0 0-4Z",
  hat: "M9 5h14l-2 17H11ZM4 22h24v4H4Z",
  ship: "M15 3h2v17h-2ZM13 6v12H4Zm6 3 8 9h-8ZM3 21h26l-5 7H9Z",
  dog: "M18 5h7l4 5-3 5h-5v9h-3v4h-4v-7H9v7H5V16L2 12l2-3 5 5h8l1-4-3-3Zm4 3v3h3V8Z",
  boot: "M9 4h12v14l6 3q3 1 2 6H5v-7h4Zm4 4v3h5V8Zm0 6v3h5v-3Z",
  cat: "M8 3l7 5h3l6-5v14q0 5-5 6v4H7v-4q-5 0-5-5v-5h3v5q0 2 3 2Zm3 9v3h3v-3Zm8 0v3h3v-3Z",
  iron: "M10 9q1-5 6-5h5q4 0 5 4l1 6h-4l-1-5q0-1-2-1h-4q-2 0-2 2Zm-5 9q4-5 11-5h10l3 12H3Zm-2 9h26v2H3Z",
  thimble: "M9 5q7-5 14 0l3 23H6Zm3 3v3h3V8Zm6 0v3h3V8Zm-7 6v3h3v-3Zm8 0v3h3v-3Zm-8 6v3h3v-3Zm8 0v3h3v-3Z",
};

export function PlayerToken({ token, color, name, active = false }: {
  token: string;
  color: string;
  name: string;
  active?: boolean;
}) {
  const kind = Object.prototype.hasOwnProperty.call(silhouettes, token) ? token : "car";
  const label = `${name} · ${kind}${active ? " · current turn" : ""}`;
  return <span className={`player-token${active ? " is-active" : ""}`} style={{ "--token-color": color } as CSSProperties} title={label}>
    <svg viewBox="0 0 32 32" role="img" aria-label={label} focusable="false">
      <path d={silhouettes[kind]} fill="currentColor" fillRule="evenodd" />
    </svg>
  </span>;
}
