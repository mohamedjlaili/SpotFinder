/**
 * @file AuthLayout.tsx
 * @description Layout component for authentication routes (login, signup).
 * Prevents authenticated users from accessing login/signup by redirecting them to the dashboard,
 * displays a spinner while resolving the session status, and provides a styled wrapper for the Auth views.
 */

import { Outlet, Navigate } from "react-router";
import { useAuth } from "../../contexts/AuthContext";

/**
 * Authentication layout component.
 * 
 * @function AuthLayout
 * @returns {JSX.Element}
 */
export function AuthLayout() {
  const { user, isLoading } = useAuth();

  // Show a loading screen while resolving user authentication state on mount
  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50">
        <div className="flex flex-col items-center gap-3">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600"></div>
          <span className="text-sm font-semibold text-slate-500">Sécurisation de la session...</span>
        </div>
      </div>
    );
  }

  // Redirect to dashboard if the user is already signed in
  if (user) {
    return <Navigate to="/dashboard" replace />;
  }

  // Render child auth views (Login, Signup) inside a styled card wrapper with ambient background animations
  return (
    <div className="min-h-screen flex items-center justify-center p-6 relative overflow-hidden bg-gradient-to-br from-white via-indigo-50/10 to-white">
      {/* Premium ambient backdrop glow */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none z-0">
        <div className="absolute -top-[15%] -left-[15%] w-[60%] h-[60%] rounded-full bg-indigo-500/5 blur-[120px] animate-pulse" />
        <div className="absolute -bottom-[15%] -right-[15%] w-[60%] h-[60%] rounded-full bg-purple-500/5 blur-[120px] animate-pulse" style={{ animationDuration: '8s' }} />
      </div>
      
      <div className="relative z-10 w-full max-w-md">
        {/* React Router Outlet renders child routes: LoginPage or SignupPage */}
        <Outlet />
      </div>
    </div>
  );
}

