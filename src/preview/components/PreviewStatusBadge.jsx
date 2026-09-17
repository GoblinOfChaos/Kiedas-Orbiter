export default function PreviewStatusBadge({ children, tone = 'neutral', className = '', ...props }) {
  return <span className={`preview-status-badge preview-status-badge--${tone} ${className}`.trim()} {...props}>{children}</span>;
}
