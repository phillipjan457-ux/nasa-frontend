export function gridBounds(
  gx: number,
  gy: number,
  step: number,
): [[number, number], [number, number]] | null {
  if (![gx, gy, step].every(Number.isFinite) || step <= 0) return null;
  const south = Math.max(-90, gy * step - 90),
    north = Math.min(90, (gy + 1) * step - 90);
  const west = Math.max(-180, gx * step - 180),
    east = Math.min(180, (gx + 1) * step - 180);
  return south < north && west < east
    ? [
        [south, west],
        [north, east],
      ]
    : null;
}

export function frpColor(value: number) {
  if (!Number.isFinite(value) || value < 0) return null;
  return value < 10 ? "#fff0c2" : value < 50 ? "#f8c56b" : value < 100 ? "#e88335" : "#a83224";
}

export function observationBounds(point: {
  south?: number;
  north?: number;
  west?: number;
  east?: number;
  lat: number;
  scan_km?: number | null;
  track_km?: number | null;
}): [[number, number], [number, number]] | null {
  const { south, north, west, east } = point;
  if (![south, north, west, east].every((n) => typeof n === "number" && Number.isFinite(n)))
    return null;
  // Scan/track lack orientation: this is an approximate envelope, not a pixel polygon.
  const latPad = Math.max(0, point.track_km ?? 0) / 222.64;
  const lonPad =
    Math.max(0, point.scan_km ?? 0) /
    (222.64 * Math.max(0.01, Math.cos((point.lat * Math.PI) / 180)));
  if (south! - latPad >= north! + latPad || west! - lonPad >= east! + lonPad) return null;
  return [
    [Math.max(-90, south! - latPad), Math.max(-180, west! - lonPad)],
    [Math.min(90, north! + latPad), Math.min(180, east! + lonPad)],
  ];
}
