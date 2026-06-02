import { BrowserRouter, Routes, Route } from "react-router-dom";
import { MainLayout } from "./components/layout/MainLayout";
import { DashboardPage } from "./components/dashboard/DashboardPage";
import { StoreListPage } from "./components/stores/StoreListPage";
import { StaffListPage } from "./components/staff/StaffListPage";
import { RequirementsPage } from "./components/requirements/RequirementsPage";
import { CalendarPage } from "./components/calendar/CalendarPage";
import { AiSettingsPanel } from "./components/ai/AiSettingsPanel";
import { PasswordScreen } from "./components/auth/PasswordScreen";
import { useAuthStore } from "./stores/useAuthStore";

function App() {
  const isUnlocked = useAuthStore((s) => s.isUnlocked);

  if (!isUnlocked) {
    return <PasswordScreen />;
  }

  return (
    <BrowserRouter>
      <Routes>
        <Route element={<MainLayout />}>
          <Route path="/" element={<DashboardPage />} />
          <Route path="/stores" element={<StoreListPage />} />
          <Route path="/staff" element={<StaffListPage />} />
          <Route path="/requirements" element={<RequirementsPage />} />
          <Route path="/calendar" element={<CalendarPage />} />
          <Route path="/settings" element={<AiSettingsPanel />} />
        </Route>
      </Routes>
    </BrowserRouter>
  );
}

export default App;
