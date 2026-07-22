import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Lifecycle Copilot",
  description: "Consultant CRM IA — analyse de données lifecycle",
};

export default function LifecycleCopilotLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
