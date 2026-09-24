import type { CSSProperties } from "react";

const pips: Record<number, number[]> = { 1: [4], 2: [0, 8], 3: [0, 4, 8], 4: [0, 2, 6, 8], 5: [0, 2, 4, 6, 8], 6: [0, 2, 3, 5, 6, 8] };
const rotations = ["", "rotateX(0deg)", "rotateY(-90deg)", "rotateX(-90deg)", "rotateX(90deg)", "rotateY(90deg)", "rotateY(180deg)"];

export function Dice({ values, rolling = false }: { values: [number, number] | null; rolling?: boolean }) {
  return <div className={`dice-stage ${rolling ? "is-rolling" : ""}`} role="img" aria-label={rolling ? "Rolling dice" : values ? `Dice: ${values[0]} and ${values[1]}` : "Ready to roll"}>
    {(values ?? [1, 1]).map((value, index) => <div className="dice-bounce" key={index}>
      <div className="dice-cube" style={{ "--landing": rotations[value] } as CSSProperties}>
        {[1, 2, 3, 4, 5, 6].map(face => <div className={`dice-face face-${face}`} key={face}>
          {Array.from({ length: 9 }, (_, pip) => <span key={pip} className={pips[face].includes(pip) ? "pip visible" : "pip"} />)}
        </div>)}
      </div>
    </div>)}
  </div>;
}
