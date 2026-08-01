import type { Metadata } from "next";
import AppShell from "@/components/tastestack/AppShell";
import SettingsPage from "@/components/tastestack/SettingsPage";

export const metadata: Metadata = {
  title: "Settings",
  description: "Edit your TasteStack profile.",
  robots: { index: false, follow: true },
};

export default function Page() {
  return (
    <AppShell>
      <SettingsPage />
    </AppShell>
  );
}
