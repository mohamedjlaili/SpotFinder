/**
 * @file routes.tsx
 * @description Defines the client-side routing structure using React Router.
 * Configures the router hierarchy with nested routes, layout components (Root, Auth, Dashboard),
 * and individual page views (welcome, authentication pages, dashboards, map, reservations, management views, and chat).
 */

import { createBrowserRouter, Navigate } from "react-router";
import { RootLayout } from "./layouts/RootLayout";
import { AuthLayout } from "./layouts/AuthLayout";
import { DashboardLayout } from "./layouts/DashboardLayout";
import { LoginPage } from "./pages/LoginPage";
import { SignupPage } from "./pages/SignupPage";
import { UserDashboard } from "./pages/UserDashboard";
import { ManagerDashboard } from "./pages/ManagerDashboard";
import { AdminDashboard } from "./pages/AdminDashboard";
import { MapPage } from "./pages/MapPage";
import { ReservationsPage } from "./pages/ReservationsPage";
import { SpacesManagementPage } from "./pages/SpacesManagementPage";
import { UsersManagementPage } from "./pages/UsersManagementPage";
import { NotFoundPage } from "./pages/NotFoundPage";
import { WelcomePage } from "./pages/WelcomePage";
import { ChatPage } from "./pages/ChatPage";

// Export the browser router configuration with nested routing
export const router = createBrowserRouter([
  {
    // The top-level root path uses RootLayout for global context/splash styling
    path: "/",
    Component: RootLayout,
    children: [
      {
        // Default landing page
        index: true,
        Component: WelcomePage,
      },
      {
        // Authentication sub-routes (login, signup) wrapped in AuthLayout
        path: "auth",
        Component: AuthLayout,
        children: [
          {
            path: "login",
            Component: LoginPage,
          },
          {
            path: "signup",
            Component: SignupPage,
          },
        ],
      },
      {
        // Authenticated dashboard routes wrapped in DashboardLayout
        path: "dashboard",
        Component: DashboardLayout,
        children: [
          {
            // Redirect /dashboard to /dashboard/overview by default
            index: true,
            element: <Navigate to="overview" replace />,
          },
          {
            // Main user dashboard overview
            path: "overview",
            Component: UserDashboard,
          },
          {
            // Interactive map for finding spaces
            path: "map",
            Component: MapPage,
          },
          {
            // User reservations list
            path: "reservations",
            Component: ReservationsPage,
          },
          {
            // Spaces management page (primarily for managers/admins)
            path: "spaces",
            Component: SpacesManagementPage,
          },
          {
            // Users list and management (primarily for admins)
            path: "users",
            Component: UsersManagementPage,
          },
          {
            // Coworking center communication/chat page
            path: "chat",
            Component: ChatPage,
          },
        ],
      },
      {
        // Catch-all route to display 404 page for unmatched paths
        path: "*",
        Component: NotFoundPage,
      },
    ],
  },
]);

