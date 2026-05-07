import { useEffect, useState } from "react";
import { AppLayout } from "./components/layout/AppLayout";
import { parseRoute, routeToHash, type BreadcrumbItem } from "./lib/navigation";
import { supabaseConfigError } from "./lib/supabase";
import { ProgramaDetailPage } from "./pages/ProgramaDetailPage";
import { ProgramasPage } from "./pages/ProgramasPage";
import { UnidadDetailPage } from "./pages/UnidadDetailPage";

interface StatusState {
  tone: "success" | "error" | "info";
  message: string;
}

function getInitialRoute() {
  return parseRoute(window.location.hash);
}

export default function App() {
  const [route, setRoute] = useState(getInitialRoute);
  const [breadcrumbs, setBreadcrumbs] = useState<BreadcrumbItem[]>([
    { label: "Programas", href: routeToHash({ name: "programas" }) },
  ]);
  const [status, setStatus] = useState<StatusState | null>(
    supabaseConfigError
      ? {
          tone: "error",
          message: `${supabaseConfigError} Revisa tus variables de entorno antes de usar la app.`,
        }
      : null,
  );

  useEffect(() => {
    if (!window.location.hash) {
      window.location.hash = routeToHash({ name: "programas" });
    }

    function handleHashChange() {
      setRoute(parseRoute(window.location.hash));
    }

    window.addEventListener("hashchange", handleHashChange);
    return () => window.removeEventListener("hashchange", handleHashChange);
  }, []);

  useEffect(() => {
    if (route.name === "programas") {
      setBreadcrumbs([{ label: "Programas" }]);
    }
  }, [route]);

  useEffect(() => {
    if (status?.tone !== "success") return;
    const timer = window.setTimeout(() => setStatus(null), 4000);
    return () => window.clearTimeout(timer);
  }, [status]);

  let content = <ProgramasPage onStatus={(tone, message) => setStatus({ tone, message })} />;

  if (route.name === "programa") {
    content = (
      <ProgramaDetailPage
        onBreadcrumbs={setBreadcrumbs}
        onStatus={(tone, message) => setStatus({ tone, message })}
        programaId={route.programaId}
      />
    );
  }

  if (route.name === "unidad") {
    content = (
      <UnidadDetailPage
        onBreadcrumbs={setBreadcrumbs}
        onStatus={(tone, message) => setStatus({ tone, message })}
        programaId={route.programaId}
        unidadId={route.unidadId}
      />
    );
  }

  return (
    <AppLayout
      breadcrumbs={breadcrumbs}
      onDismissStatus={() => setStatus(null)}
      status={status}
    >
      {content}
    </AppLayout>
  );
}
