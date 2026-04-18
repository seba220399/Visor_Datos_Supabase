interface StatusBannerProps {
  tone: "success" | "error" | "info";
  message: string;
  onClose?: () => void;
}

export function StatusBanner({ tone, message, onClose }: StatusBannerProps) {
  return (
    <div className={`status-banner status-${tone}`} role="status">
      <span>{message}</span>
      {onClose ? (
        <button className="status-close" onClick={onClose} type="button">
          Cerrar
        </button>
      ) : null}
    </div>
  );
}
