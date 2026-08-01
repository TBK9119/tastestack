import type { Metadata } from "next";
import AppShell from "@/components/tastestack/AppShell";
import LoginPage from "@/components/tastestack/LoginPage";

export const metadata: Metadata = {
  title: "Log in",
  description: "Log in to your TasteStack account.",
};

export default function Page() {
  return (
    <AppShell>
      <LoginPage />
    </AppShell>
  );
}
