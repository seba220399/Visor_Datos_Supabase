import { type ReactNode, useState } from "react";

const APP_PASSWORD = import.meta.env.VITE_APP_PASSWORD ?? "";
const AUTH_KEY = "visor_auth";

function isAuthenticated() {
  return !APP_PASSWORD || localStorage.getItem(AUTH_KEY) === "1";
}

export function PasswordGate({ children }: { children: ReactNode }) {
  const [authed, setAuthed] = useState(isAuthenticated);
  const [input, setInput] = useState("");
  const [error, setError] = useState(false);

  if (authed) {
    return <>{children}</>;
  }

  function handleSubmit(event: React.FormEvent) {
    event.preventDefault();

    if (input === APP_PASSWORD) {
      localStorage.setItem(AUTH_KEY, "1");
      setAuthed(true);
    } else {
      setError(true);
      setInput("");
    }
  }

  return (
    <div className="password-gate">
      <div className="password-gate-card">
        <div>
          <p className="eyebrow">Supabase</p>
          <h1 className="password-gate-title">Gestor de contenido academico</h1>
          <p className="password-gate-subtitle">Ingresa la contraseña para continuar.</p>
        </div>
        <form className="password-gate-form" onSubmit={handleSubmit}>
          <input
            autoFocus
            className="password-gate-input"
            onChange={(e) => {
              setInput(e.target.value);
              setError(false);
            }}
            placeholder="Contraseña"
            type="password"
            value={input}
          />
          {error ? <p className="form-error">Contraseña incorrecta.</p> : null}
          <button className="button button-primary" type="submit">
            Entrar
          </button>
        </form>
      </div>
    </div>
  );
}
