import type { ReactNode } from 'react';
import { Link } from 'react-router-dom';

export interface BreadcrumbItem {
  readonly label: string;
  readonly href?: string;
}

export interface PageHeaderProps {
  readonly title: string;
  readonly subtitle?: string;
  readonly breadcrumbs?: readonly BreadcrumbItem[];
  readonly actions?: ReactNode;
}

export function PageHeader({ title, subtitle, breadcrumbs, actions }: PageHeaderProps) {
  return (
    <div className="mb-6 flex flex-col gap-3">
      {breadcrumbs && breadcrumbs.length > 0 && (
        <nav aria-label="Breadcrumb" className="text-xs">
          <ol className="flex flex-wrap items-center gap-1.5 text-text-muted">
            {breadcrumbs.map((crumb, idx) => {
              const isLast = idx === breadcrumbs.length - 1;
              return (
                <li key={crumb.label} className="flex items-center gap-1.5">
                  {idx > 0 && <span className="text-border">/</span>}
                  {crumb.href && !isLast ? (
                    <Link
                      className="hover:text-text hover:underline focus-visible:outline-primary"
                      to={crumb.href}
                    >
                      {crumb.label}
                    </Link>
                  ) : (
                    <span className={isLast ? 'text-text font-bold' : ''}>{crumb.label}</span>
                  )}
                </li>
              );
            })}
          </ol>
        </nav>
      )}

      <div className="flex items-center justify-between gap-4 max-md:flex-col max-md:items-start max-md:gap-3">
        <div>
          <h1 className="text-text text-2xl font-bold tracking-tight max-md:text-xl">{title}</h1>
          {subtitle && <p className="text-text-muted mt-1 text-sm">{subtitle}</p>}
        </div>

        {actions && (
          <div className="flex items-center gap-2 max-md:w-full max-md:flex-col max-md:items-stretch">
            {actions}
          </div>
        )}
      </div>
    </div>
  );
}
