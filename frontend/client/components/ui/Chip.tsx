interface ChipProps extends React.HTMLAttributes<HTMLDivElement> {
  label: string;
  variant?: "primary" | "secondary" | "accent";
}

export function Chip({
  label,
  variant = "primary",
  className = "",
  ...props
}: ChipProps) {
  const variants = {
    primary: "bg-primary/10 text-primary border border-primary/20",
    secondary: "bg-secondary text-secondary-foreground border border-border",
    accent: "bg-accent/10 text-accent border border-accent/20",
  };

  return (
    <div
      className={`inline-flex items-center px-3 py-1.5 rounded-full text-xs font-medium ${variants[variant]} ${className}`}
      {...props}
    >
      {label}
    </div>
  );
}
