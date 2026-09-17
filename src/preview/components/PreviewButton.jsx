export default function PreviewButton({
  children,
  variant = 'secondary',
  iconOnly = false,
  className = '',
  type = 'button',
  ...props
}) {
  return (
    <button
      type={type}
      className={`preview-button preview-button--${variant}${iconOnly ? ' preview-button--icon' : ''} ${className}`.trim()}
      {...props}
    >
      {children}
    </button>
  );
}
