export function getNextNumericValue(
  rows: Array<Record<string, unknown>>,
  key: string,
) {
  const values = rows
    .map((row) => Number(row[key]))
    .filter((value) => Number.isFinite(value));

  if (values.length === 0) {
    return 1;
  }

  return Math.max(...values) + 1;
}

export function formatValue(value: unknown) {
  if (value === null || value === undefined || value === "") {
    return "-";
  }

  if (typeof value === "string" && /^\d{4}-\d{2}-\d{2}T/.test(value)) {
    const parsedDate = new Date(value);

    if (!Number.isNaN(parsedDate.getTime())) {
      return parsedDate.toLocaleString("es-CL");
    }
  }

  return String(value);
}
