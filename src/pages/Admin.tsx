import { Navigate } from "react-router-dom";

/** @deprecated Use /sistema */
export function Admin() {
  return <Navigate to="/sistema" replace />;
}
