import type { Metadata } from "next";
import AppShell from "@/components/tastestack/AppShell";
import SignupPage from "@/components/tastestack/SignupPage";

export const metadata: Metadata = {
  title: "Sign up",
  description: "Create a free TasteStack account and start tracking everything you love.",
};

export default function Page() {
  return (
    <AppShell>
      <SignupPage />
    </AppShell>
  );
}
