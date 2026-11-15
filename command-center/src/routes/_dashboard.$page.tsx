import { createFileRoute, notFound } from "@tanstack/react-router";

const pages = [
  "map",
  "heatmap",
  "overview",
  "calendar",
  "sensors",
  "history",
  "anomalies",
  "prediction",
  "methodology",
  "help",
];

export const Route = createFileRoute("/_dashboard/$page")({
  beforeLoad: ({ params }) => {
    if (!pages.includes(params.page)) throw notFound();
  },
  head: ({ params }) => ({ meta: [{ title: `FIREWATCH · ${params.page}` }] }),
  component: () => null,
});
