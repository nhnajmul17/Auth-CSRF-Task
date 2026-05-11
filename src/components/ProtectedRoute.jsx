import { Navigate, useLocation } from "react-router-dom";
import { useAuth } from "../context/AuthContext";

function ProtectedRoute({ children }) {
  const { isLoggedIn } = useAuth();
  const location = useLocation();

  if (!isLoggedIn) {
    // Redirect to the demo page where the user can log in
    return <Navigate to="/demo" replace state={{ from: location }} />;
  }

  return children;
}

export default ProtectedRoute;
