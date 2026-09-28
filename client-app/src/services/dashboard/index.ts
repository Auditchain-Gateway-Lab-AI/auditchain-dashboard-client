import type { DashboardService } from "@/services/dashboard/dashboard.service";
import { mockDashboardService } from "@/services/dashboard/mock-dashboard.service";

// Swap this binding to apiDashboardService when the Go REST API is available.
export const dashboardService: DashboardService = mockDashboardService;
