import { useEffect, useRef, useState } from "react";
import type { GameState } from "@monopoly/shared";

// Keep server state authoritative; only delay its presentation during a throw.
export function useGamePresentation(game: GameState | null) {
  const latest = useRef(game);
  latest.current = game;
  const [displayed, setDisplayed] = useState(game);
  const [rolling, setRolling] = useState(false);
  const [turnNotice, setTurnNotice] = useState(false);
  const lastRoll = useRef(game?.rollId);
  const initialized = useRef(false);
  const timer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);

  useEffect(() => {
    if (!game) return;
    if (initialized.current && game.rollId !== lastRoll.current && game.dice) {
      clearTimeout(timer.current);
      setRolling(true);
      timer.current = setTimeout(() => {
        setDisplayed(latest.current);
        setRolling(false);
      }, window.matchMedia("(prefers-reduced-motion: reduce)").matches ? 100 : 1250);
    } else if (!rolling) {
      setDisplayed(game);
    }
    initialized.current = true;
    lastRoll.current = game.rollId;
  }, [game, rolling]);

  useEffect(() => () => clearTimeout(timer.current), []);
  useEffect(() => {
    if (displayed?.status !== "ACTIVE") return;
    setTurnNotice(true);
    const id = setTimeout(() => setTurnNotice(false), 1300);
    return () => clearTimeout(id);
  }, [displayed?.currentPlayer, displayed?.status]);

  return { displayed, rolling, turnNotice };
}
