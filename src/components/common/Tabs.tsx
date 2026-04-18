interface TabItem {
  key: string;
  label: string;
}

interface TabsProps {
  items: TabItem[];
  activeKey: string;
  onChange: (key: string) => void;
}

export function Tabs({ items, activeKey, onChange }: TabsProps) {
  return (
    <div className="tabs" role="tablist" aria-label="Secciones de la unidad">
      {items.map((item) => (
        <button
          aria-selected={activeKey === item.key}
          className={`tab-button ${activeKey === item.key ? "tab-button-active" : ""}`}
          key={item.key}
          onClick={() => onChange(item.key)}
          role="tab"
          type="button"
        >
          {item.label}
        </button>
      ))}
    </div>
  );
}
