import type { ReactNode } from "react";
import type { BreadcrumbItem } from "../../lib/navigation";
import { Breadcrumbs } from "../common/Breadcrumbs";
import { NotificationCenter } from "../common/NotificationCenter";
import { StatusBanner } from "../common/StatusBanner";

interface AppLayoutProps {
  children: ReactNode;
  breadcrumbs: BreadcrumbItem[];
  status?: {
    tone: "success" | "error" | "info";
    message: string;
  } | null;
  onDismissStatus: () => void;
}

export function AppLayout({
  children,
  breadcrumbs,
  status,
  onDismissStatus,
}: AppLayoutProps) {
  return (
    <div className="app-shell">
      <NotificationCenter />
      <header className="hero">
        <div className="hero-copy">
          <p className="eyebrow">Supabase</p>
          <h1>Gestor de contenido academico</h1>
          <p className="hero-text">
            Administra programas, unidades y sus contenidos sin entrar al panel tecnico.
          </p>
        </div>
      </header>

      <main className="main-layout">
        <Breadcrumbs items={breadcrumbs} />
        <div className="status-slot">
          {status ? (
            <StatusBanner message={status.message} onClose={onDismissStatus} tone={status.tone} />
          ) : null}
        </div>
        {children}
      </main>
    </div>
  );
}
