export type CardEffect =
  | { kind: "cash"; amount: number }
  | { kind: "move"; position: number; collectGo?: boolean }
  | { kind: "jail" }
  | { kind: "jailCard" }
  | { kind: "back"; spaces: number }
  | { kind: "nearestRailroad" }
  | { kind: "nearestUtility" }
  | { kind: "repairs"; house: number; hotel: number }
  | { kind: "payEach"; amount: number }
  | { kind: "collectEach"; amount: number };

export type Card = {
  text: string;
  effect: CardEffect;
};

export const chanceCards: Card[] = [
  { text: "GET OUT OF JAIL FREE. Keep until needed.", effect: { kind: "jailCard" } },
  { text: "Make general repairs: $25 per house, $100 per hotel.", effect: { kind: "repairs", house: 25, hotel: 100 } },
  { text: "Speeding fine $15.", effect: { kind: "cash", amount: -15 } },
  { text: "Elected chairman. Pay each player $50.", effect: { kind: "payEach", amount: 50 } },
  { text: "Go back three spaces.", effect: { kind: "back", spaces: 3 } },
  { text: "Advance to the nearest utility.", effect: { kind: "nearestUtility" } },
  { text: "Bank pays you dividend of $50.", effect: { kind: "cash", amount: 50 } },
  { text: "Advance to the nearest railroad.", effect: { kind: "nearestRailroad" } },
  { text: "Pay poor tax of $15.", effect: { kind: "cash", amount: -15 } },
  { text: "Take a trip to Reading Railroad. If you pass GO collect $200.", effect: { kind: "move", position: 5, collectGo: true } },
  { text: "ADVANCE to Boardwalk.", effect: { kind: "move", position: 39 } },
  { text: "ADVANCE to Illinois Avenue. If you pass GO collect $200.", effect: { kind: "move", position: 24, collectGo: true } },
  { text: "Your building loan matures. Collect $150.", effect: { kind: "cash", amount: 150 } },
  { text: "Advance to the nearest railroad.", effect: { kind: "nearestRailroad" } },
  { text: "ADVANCE to St. Charles Place. If you pass GO collect $200.", effect: { kind: "move", position: 11, collectGo: true } },
  { text: "Go to Jail. Do not pass GO. Do not collect $200.", effect: { kind: "jail" } },
];

export const communityChestCards: Card[] = [
  { text: "Get out of Jail Free. Keep until needed.", effect: { kind: "jailCard" } },
  { text: "You have won second prize in a beauty contest. Collect $10.", effect: { kind: "cash", amount: 10 } },
  { text: "From sale of stock, you get $50.", effect: { kind: "cash", amount: 50 } },
  { text: "Life insurance matures. Collect $100.", effect: { kind: "cash", amount: 100 } },
  { text: "Income tax refund. Collect $20.", effect: { kind: "cash", amount: 20 } },
  { text: "Holiday fund matures. Receive $100.", effect: { kind: "cash", amount: 100 } },
  { text: "You inherit $100.", effect: { kind: "cash", amount: 100 } },
  { text: "Receive $25 consultancy fee.", effect: { kind: "cash", amount: 25 } },
  { text: "Pay hospital fees of $100.", effect: { kind: "cash", amount: -100 } },
  { text: "Bank error in your favor. Collect $200.", effect: { kind: "cash", amount: 200 } },
  { text: "Pay school fees of $50.", effect: { kind: "cash", amount: -50 } },
  { text: "Doctor's fee. Pay $50.", effect: { kind: "cash", amount: -50 } },
  { text: "It is your birthday. Collect $10 from every player.", effect: { kind: "collectEach", amount: 10 } },
  { text: 'Advance to "GO" (Collect $200).', effect: { kind: "move", position: 0, collectGo: true } },
  { text: "Street repairs: $40 per house, $115 per hotel.", effect: { kind: "repairs", house: 40, hotel: 115 } },
  { text: "Go to Jail. Do not pass GO. Do not collect $200.", effect: { kind: "jail" } },
];
