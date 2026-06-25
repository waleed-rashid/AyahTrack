import { Navigate, Outlet } from "react-router-dom";
import { isAuthenticated } from "./auth";

export default function PublicRoute() {
  if (isAuthenticated()) {
    return <Navigate to="/dashboard" replace />;
  }

  return <Outlet />;
}
