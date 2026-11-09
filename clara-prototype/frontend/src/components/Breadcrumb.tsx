/**
 * Breadcrumb navigation component.
 */

import { Link } from 'react-router-dom';

export interface BreadcrumbItem {
  label: string;
  path?: string; // If not provided, it's the current page (not a link)
}

interface BreadcrumbProps {
  items: BreadcrumbItem[];
}

export function Breadcrumb({ items }: BreadcrumbProps) {
  return (
    <nav
      style={{
        fontSize: '14px',
        color: '#666',
        marginBottom: '20px',
        padding: '8px 0',
      }}
      aria-label="breadcrumb"
    >
      {items.map((item, index) => (
        <span key={index}>
          {item.path ? (
            <Link
              to={item.path}
              style={{
                color: '#0066cc',
                textDecoration: 'none',
              }}
            >
              {item.label}
            </Link>
          ) : (
            <span style={{ color: '#999' }}>{item.label}</span>
          )}

          {index < items.length - 1 && (
            <span style={{ margin: '0 8px', color: '#ccc' }}>/</span>
          )}
        </span>
      ))}
    </nav>
  );
}
