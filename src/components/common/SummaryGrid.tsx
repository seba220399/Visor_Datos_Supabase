import { getEntityConfig } from "../../config/entities";
import { formatValue } from "../../lib/records";
import type { AnyEntityRow, EntityKey } from "../../types/entities";

interface SummaryGridProps {
  entityKey: EntityKey;
  row: AnyEntityRow;
}

export function SummaryGrid({ entityKey, row }: SummaryGridProps) {
  const config = getEntityConfig(entityKey);

  return (
    <div className="summary-grid">
      {config.summaryFields.map((field) => {
        const fieldConfig = config.fields.find((item) => item.key === field);
        const label = fieldConfig?.label ?? field.replaceAll("_", " ");

        return (
          <div className="summary-item" key={field}>
            <span className="summary-label">{label}</span>
            <strong>{formatValue((row as Record<string, unknown>)[field])}</strong>
          </div>
        );
      })}
    </div>
  );
}
