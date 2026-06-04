/**
 * @file RootLayout.tsx
 * @description The top-level root layout. Wraps the entire application path tree
 * inside the global AuthProvider context and supplies the base document viewport.
 */

import { Outlet } from "react-router";
import { AuthProvider } from "../../contexts/AuthContext";

/**
 * RootLayout layout component.
 * 
 * @function RootLayout
 * @returns {JSX.Element}
 */
export function RootLayout() {
  return (
    // Wrap the component tree in the authentication state provider
    <AuthProvider>
      <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100">
        {/* Render nested routes (WelcomePage, AuthLayout, DashboardLayout, or NotFoundPage) */}
        <Outlet />
      </div>
    </AuthProvider>
  );
}

