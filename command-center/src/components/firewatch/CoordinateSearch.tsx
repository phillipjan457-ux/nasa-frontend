import { useText } from "@/lib/firewatch/i18n";
import { useState, useId } from "react";
import type { Map } from "leaflet";
import { Search } from "lucide-react";
export type Place = { name: string; bounds: [[number, number], [number, number]] };
export function CoordinateSearch({ map, places = [] }: { map: Map | null; places?: Place[] }) {
  const text = useText();
  const id = useId();
  const [value, setValue] = useState(""),
    [error, setError] = useState("");
  return (
    <form
      className="coordinate-search"
      aria-label="Coordinate search"
      onSubmit={(event) => {
        event.preventDefault();
        const place = places.find(
          (p) => p.name.toLocaleLowerCase() === value.trim().toLocaleLowerCase(),
        );
        if (place) {
          map?.fitBounds(place.bounds, { maxZoom: 9, animate: false });
          setError("");
          return;
        }
        const parts = value.trim().split(/[,\s]+/);
        const [lat, lon] = parts.map(Number);
        if (
          parts.length !== 2 ||
          !Number.isFinite(lat) ||
          !Number.isFinite(lon) ||
          Math.abs(lat!) > 90 ||
          Math.abs(lon!) > 180
        ) {
          setError(
            "Choose a province from the suggestions or enter latitude, longitude (-90 to 90, -180 to 180).",
          );
          return;
        }
        setError("");
        map?.setView([lat!, lon!], map.getZoom(), { animate: false });
      }}
    >
      <label className="sr-only" htmlFor={id}>
        {text("Latitude, longitude")}
        {places.length > 0 && " or province"}
      </label>
      <input
        id={id}
        list={id + "-places"}
        placeholder={places.length ? "Province or lat, lon" : text("Latitude, longitude")}
        aria-describedby={id + "-hint"}
        value={value}
        onChange={(e) => setValue(e.target.value)}
      />
      <datalist id={id + "-places"}>
        {places.map((place) => (
          <option value={place.name} key={place.name} />
        ))}
      </datalist>
      <button
        type="submit"
        className="archive-button"
        disabled={!map}
        aria-label={text("Search")}
        title={text("Search")}
      >
        <Search size={18} aria-hidden="true" />
      </button>
      <span className="sr-only" id={id + "-hint"}>
        {places.length
          ? "Search the supplied province boundaries, or enter latitude, longitude."
          : "Enter latitude, longitude."}{" "}
        This moves the map without changing analysis filters.
      </span>
      {error && (
        <span role="alert">
          {error}
          <button type="button" aria-label="Dismiss coordinate error" onClick={() => setError("")}>
            ×
          </button>
        </span>
      )}
    </form>
  );
}
