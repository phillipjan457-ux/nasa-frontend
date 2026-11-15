import type { Place } from "@/components/firewatch/CoordinateSearch";

/** Search the supplied boundary vintage, without a remote geocoder. */
export function provincePlaces(geo: any): Place[] {
  return (geo?.features ?? []).flatMap((feature: any) => {
    const name = feature.properties?.shapeName ?? feature.properties?.name;
    let south = 90, north = -90, west = 180, east = -180, count = 0;
    const visit = (value: any) => {
      if (!Array.isArray(value)) return;
      if (typeof value[0] === "number" && typeof value[1] === "number") {
        if (!Number.isFinite(value[0]) || !Number.isFinite(value[1])) return;
        south = Math.min(south, value[1]); north = Math.max(north, value[1]);
        west = Math.min(west, value[0]); east = Math.max(east, value[0]); count++;
      } else value.forEach(visit);
    };
    visit(feature.geometry?.coordinates);
    return name && count ? [{ name, bounds: [[south, west], [north, east]] as Place["bounds"] }] : [];
  }).sort((a: Place, b: Place) => a.name.localeCompare(b.name));
}
