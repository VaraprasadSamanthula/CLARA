/**
 * Header component.
 */

interface HeaderProps {
  title?: string;
  subtitle?: string;
}

export function Header({ title = 'CLARA Prototype 1', subtitle = 'Clinical Longitudinal Analysis and Retrieval Assistant' }: HeaderProps) {
  return (
    <div className="header">
      <div className="container">
        <h1>{title}</h1>
        <p>{subtitle}</p>
      </div>
    </div>
  );
}
