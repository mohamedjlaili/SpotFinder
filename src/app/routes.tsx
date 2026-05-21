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

export const router = createBrowserRouter([
  {
    path: "/",
    Component: RootLayout,
    children: [
      {
        index: true,
        Component: WelcomePage,
      },
      {
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
        path: "dashboard",
        Component: DashboardLayout,
        children: [
          {
            index: true,
            element: <Navigate to="overview" replace />,
          },
          {
            path: "overview",
            Component: UserDashboard,
          },
          {
            path: "map",
            Component: MapPage,
          },
          {
            path: "reservations",
            Component: ReservationsPage,
          },
          {
            path: "spaces",
            Component: SpacesManagementPage,
          },
          {
            path: "users",
            Component: UsersManagementPage,
          },
          {
            path: "chat",
            Component: ChatPage,
          },
        ],
      },
      {
        path: "*",
        Component: NotFoundPage,
      },
    ],
  },
]);
