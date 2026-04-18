import { useEffect, type ReactNode } from "react";

interface ModalProps {
  title: string;
  children: ReactNode;
  onClose: () => void;
  placement?: "center" | "top-right";
  size?: "default" | "compact";
}

export function Modal({
  title,
  children,
  onClose,
  placement = "center",
  size = "default",
}: ModalProps) {
  useEffect(() => {
    const previousBodyOverflow = document.body.style.overflow;
    const previousHtmlOverflow = document.documentElement.style.overflow;

    document.body.style.overflow = "hidden";
    document.documentElement.style.overflow = "hidden";

    return () => {
      document.body.style.overflow = previousBodyOverflow;
      document.documentElement.style.overflow = previousHtmlOverflow;
    };
  }, []);

  return (
    <div
      className={`modal-backdrop ${placement === "top-right" ? "modal-backdrop-top-right" : ""}`}
      role="presentation"
    >
      <div
        aria-modal="true"
        className={`modal-panel ${size === "compact" ? "modal-panel-compact" : ""}`}
        role="dialog"
      >
        <div className="modal-header">
          <div>
            <h2>{title}</h2>
          </div>
          <button className="button button-secondary" onClick={onClose} type="button">
            Cerrar
          </button>
        </div>
        <div className="modal-body">{children}</div>
      </div>
    </div>
  );
}
