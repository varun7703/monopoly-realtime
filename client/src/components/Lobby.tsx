import { Copy, Link2, LogIn, ShieldCheck, UserPlus } from "lucide-react";
import { useMemo, useState } from "react";

type LobbyProps = {
  busy: boolean;
  status: string;
  name: string;
  roomId: string;
  error: string;
  onName: (value: string) => void;
  onRoomId: (value: string) => void;
  onHost: () => void;
  onJoin: () => void;
};

export function Lobby({ busy, status, name, roomId, error, onName, onRoomId, onHost, onJoin }: LobbyProps) {
  const [copied, setCopied] = useState(false);
  const previewLink = useMemo(() => {
    if (!roomId.trim()) return "";
    const url = new URL(window.location.href);
    url.searchParams.set("room", roomId.trim().toLowerCase());
    return url.toString();
  }, [roomId]);

  async function copyPreview() {
    if (!previewLink) return;
    await navigator.clipboard?.writeText(previewLink);
    setCopied(true);
    window.setTimeout(() => setCopied(false), 1500);
  }

  return (
    <main className="app-shell lobby-page">
      <section className="lobby-shell">
        <div className="lobby-copy">
          <span className="status-pill">
            <ShieldCheck size={16} />
            {status}
          </span>
          <h1>MONOPOLY</h1>
          <p>
            Host an online lobby, share the invite link, and play the classic board with friends in other browsers.
          </p>
        </div>
        <div className="lobby-card">
          <span className="eyebrow">YOUR NEXT GAME NIGHT</span>
          <h2>Pull up a chair.</h2>
          <label>
            Player name
            <input value={name} maxLength={16} onChange={(event) => onName(event.target.value)} />
          </label>
          <label>
            Room code <span className="hint">(optional when hosting — leave blank to auto-generate)</span>
            <input
              value={roomId}
              placeholder="e.g. family-night"
              maxLength={16}
              onChange={(event) => onRoomId(event.target.value)}
            />
          </label>
          {error && <p className="error-line">{error}</p>}
          <div className="action-stack">
            <button className="primary-button" onClick={onHost} disabled={busy || status !== "Connected"}>
              <UserPlus size={18} />
              {busy ? "Setting the table…" : "Host lobby"}
            </button>
            <button className="primary-button secondary" onClick={onJoin} disabled={busy || status !== "Connected" || !roomId.trim()}>
              <LogIn size={18} />
              Join lobby
            </button>
          </div>
          {previewLink && (
            <div className="invite-preview">
              <Link2 size={16} />
              <code>{previewLink}</code>
              <button type="button" className="icon-button" onClick={copyPreview} title="Copy invite link">
                <Copy size={16} />
              </button>
              {copied && <span className="copied">Copied</span>}
            </div>
          )}
        </div>
      </section>
    </main>
  );
}
