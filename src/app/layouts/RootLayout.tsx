import { Outlet } from "react-router";
import { AuthProvider } from "../../contexts/AuthContext";

export function RootLayout() {
  return (
    <AuthProvider>
      <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100">
        <Outlet />
      </div>
    </AuthProvider>
  );
}
