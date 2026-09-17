export default function PreviewPanel({ as: Element = 'section', children, className = '', ...props }) {
  return <Element className={`preview-panel ${className}`.trim()} {...props}>{children}</Element>;
}
