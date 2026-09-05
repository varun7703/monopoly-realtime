import type { Tile } from "@monopoly/shared";

export function Deed({ tile }: { tile: Tile | null }) {
  if (!tile || (!tile.price && tile.type !== "railroad" && tile.type !== "utility")) {
    return null;
  }

  if (tile.type === "railroad" || tile.type === "utility") {
    return (
      <div className="deed deed-special">
        <h3>{tile.name}</h3>
        <p>{tile.type === "railroad" ? "Rent $25 · 2: $50 · 3: $100 · 4: $200" : "Rent 4× or 10× dice if both owned."}</p>
        <p>Mortgage value ${Math.round((tile.price ?? 0) * 0.5)}</p>
      </div>
    );
  }

  if (tile.type !== "property") return null;

  return (
    <div className="deed">
      <div className="deed-header" style={{ background: tile.color }}>
        <div>TITLE DEED</div>
        <strong>{tile.name}</strong>
      </div>
      <table>
        <tbody>
          <tr>
            <td colSpan={2}>Rent ${tile.baserent}</td>
          </tr>
          <tr>
            <td>With 1 House</td>
            <td>${tile.rent1}</td>
          </tr>
          <tr>
            <td>With 2 Houses</td>
            <td>${tile.rent2}</td>
          </tr>
          <tr>
            <td>With 3 Houses</td>
            <td>${tile.rent3}</td>
          </tr>
          <tr>
            <td>With 4 Houses</td>
            <td>${tile.rent4}</td>
          </tr>
          <tr>
            <td colSpan={2}>With HOTEL ${tile.rent5}</td>
          </tr>
          <tr>
            <td colSpan={2}>Mortgage ${Math.round((tile.price ?? 0) * 0.5)}</td>
          </tr>
          <tr>
            <td colSpan={2}>Houses cost ${tile.housePrice} each</td>
          </tr>
        </tbody>
      </table>
    </div>
  );
}
