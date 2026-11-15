import { createFileRoute, Outlet } from "@tanstack/react-router";
import { RealDashboard } from "@/components/firewatch/RealDashboard";

export const Route = createFileRoute("/_dashboard")({
  component: DashboardLayout,
});

function DashboardLayout() {
  return (
    <>
      <RealDashboard />
      <Outlet />
    </>
  );
}
