import { FormEvent, useState } from "react";
import { useGameStore } from "../store/useGameStore";

export const ActionPanel = () => {
  const { room, action, saveGame, loadGame, sendChat } = useGameStore();
  const [bid, setBid] = useState("0");
  const [chat, setChat] = useState("");

  if (!room?.game) return null;

  const submitChat = (e: FormEvent) => {
    e.preventDefault();
    if (!chat.trim()) return;
    sendChat(chat.trim());
    setChat("");
  };

  return (
    <div className="space-y-3 rounded-xl border border-zinc-700 bg-zinc-900 p-4">
      <h3 className="text-lg font-semibold">Actions</h3>
      <div className="grid grid-cols-2 gap-2">
        <button className="rounded bg-blue-600 px-2 py-2" onClick={() => action("ROLL")}>Roll Dice</button>
        <button className="rounded bg-emerald-600 px-2 py-2" onClick={() => action("BUY_PROPERTY")}>Buy</button>
        <button className="rounded bg-yellow-600 px-2 py-2" onClick={() => action("START_AUCTION")}>Start Auction</button>
        <button className="rounded bg-purple-600 px-2 py-2" onClick={() => action("END_TURN")}>End Turn</button>
        <button className="rounded bg-zinc-700 px-2 py-2" onClick={() => action("PAY_JAIL_FINE")}>Pay Jail Fine</button>
        <button className="rounded bg-zinc-700 px-2 py-2" onClick={() => action("USE_JAIL_CARD")}>Use Jail Card</button>
      </div>
      <div className="flex gap-2">
        <input value={bid} onChange={(e) => setBid(e.target.value)} className="rounded bg-zinc-800 px-2 py-2" />
        <button className="rounded bg-orange-600 px-2 py-2" onClick={() => action("PLACE_BID", { bid: Number(bid) })}>Place Bid</button>
        <button className="rounded bg-zinc-700 px-2 py-2" onClick={() => action("PASS_BID")}>Pass</button>
      </div>
      <div className="flex gap-2">
        <button className="rounded bg-indigo-600 px-2 py-2" onClick={saveGame}>Save</button>
        <button className="rounded bg-indigo-600 px-2 py-2" onClick={loadGame}>Load</button>
      </div>
      <form onSubmit={submitChat} className="flex gap-2">
        <input className="flex-1 rounded bg-zinc-800 px-2 py-2" value={chat} onChange={(e) => setChat(e.target.value)} placeholder="Chat" />
        <button className="rounded bg-cyan-600 px-2 py-2">Send</button>
      </form>
    </div>
  );
};
