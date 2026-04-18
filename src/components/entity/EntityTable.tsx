import { getEntityConfig } from "../../config/entities";
import { formatValue } from "../../lib/records";
import type { AnyEntityRow, EntityKey } from "../../types/entities";

interface EntityTableAction {
  label: string | ((row: AnyEntityRow) => string);
  onClick: (row: AnyEntityRow) => void;
  tone?: "primary" | "secondary" | "danger";
}

interface EntityTableProps {
  entityKey: EntityKey;
  rows: AnyEntityRow[];
  emptyMessage: string;
  actions?: EntityTableAction[];
  getRowClassName?: (row: AnyEntityRow) => string | undefined;
  onSelect?: (row: AnyEntityRow) => void;
  selectedId?: number | null;
}

function renderCell(entityKey: EntityKey, row: AnyEntityRow, key: string) {
  const column = getEntityConfig(entityKey).listColumns.find((item) => item.key === key);

  if (column?.render) {
    return column.render(row);
  }

  return formatValue((row as Record<string, unknown>)[key]);
}

export function EntityTable({
  entityKey,
  rows,
  emptyMessage,
  actions,
  getRowClassName,
  onSelect,
  selectedId,
}: EntityTableProps) {
  const config = getEntityConfig(entityKey);

  if (rows.length === 0) {
    return <div className="empty-state">{emptyMessage}</div>;
  }

  return (
    <div className="table-wrapper">
      <table className="entity-table">
        <thead>
          <tr>
            {config.listColumns.map((column) => (
              <th key={column.key} scope="col">
                {column.label}
              </th>
            ))}
            {actions?.length ? <th scope="col">Acciones</th> : null}
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => {
            const isSelected = selectedId === row.id;
            const rowClassName = [isSelected ? "table-row-selected" : "", getRowClassName?.(row) ?? ""]
              .filter(Boolean)
              .join(" ");

            return (
              <tr
                className={rowClassName || undefined}
                key={row.id}
                onClick={onSelect ? () => onSelect(row) : undefined}
              >
                {config.listColumns.map((column) => (
                  <td
                    className={onSelect ? "table-cell-clickable" : undefined}
                    key={`${row.id}-${column.key}`}
                  >
                    {renderCell(entityKey, row, column.key)}
                  </td>
                ))}
                {actions?.length ? (
                  <td>
                    <div className="action-row">
                      {actions.map((action, index) => (
                        <button
                          className={`button button-${action.tone ?? "secondary"} button-small`}
                          key={typeof action.label === "string" ? `${action.label}-${index}` : `action-${index}`}
                          onClick={(event) => {
                            event.stopPropagation();
                            action.onClick(row);
                          }}
                          type="button"
                        >
                          {typeof action.label === "function" ? action.label(row) : action.label}
                        </button>
                      ))}
                    </div>
                  </td>
                ) : null}
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
