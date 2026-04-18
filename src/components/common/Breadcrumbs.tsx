import type { BreadcrumbItem } from "../../lib/navigation";

interface BreadcrumbsProps {
  items: BreadcrumbItem[];
}

export function Breadcrumbs({ items }: BreadcrumbsProps) {
  return (
    <nav aria-label="Breadcrumb" className="breadcrumbs">
      {items.map((item, index) => (
        <span className="breadcrumb-item" key={`${item.label}-${index}`}>
          {item.href ? (
            <a className="breadcrumb-link" href={item.href}>
              {item.label}
            </a>
          ) : (
            <span aria-current="page" className="breadcrumb-current">
              {item.label}
            </span>
          )}
          {index < items.length - 1 ? <span className="breadcrumb-separator">/</span> : null}
        </span>
      ))}
    </nav>
  );
}
