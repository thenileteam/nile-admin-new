import { Navigate, Outlet, useLocation } from "react-router-dom";
import { isAdminRole, useAuth } from "./store";

export const RequireAuth = () => {
  const status = useAuth((state) => state.status);
  const user = useAuth((state) => state.user);
  const location = useLocation();

  // A merchant/staff token must never open the console: the server already
  // refuses admin sign-in for those roles, and the guard enforces the same
  // rule against anything left in storage.
  if (status !== "authenticated" || !isAdminRole(user?.role)) {
    return <Navigate to="/sign-in" replace state={{ from: location.pathname }} />;
  }

  return <Outlet />;
};
