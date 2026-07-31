import { cn } from '@/lib/utils';

export function Badge({ className, variant = 'default', ...props }) {
  const variants = {
    default: 'bg-primary text-primary-foreground',
    secondary: 'bg-secondary text-secondary-foreground',
    destructive: 'bg-destructive text-destructive-foreground',
    outline: 'border border-input text-foreground',
    success: 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900 dark:text-emerald-200',
    warning: 'bg-amber-100 text-amber-800 dark:bg-amber-900 dark:text-amber-200',
  };

  return (
    <span
      className={cn(
        'inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium transition-colors',
        variants[variant],
        className
      )}
      {...props}
    />
  );
}

export function StatusBadge({ status }) {
  const config = {
    PENDING: { variant: 'warning', label: 'Pending' },
    CONFIRMED: { variant: 'secondary', label: 'Confirmed' },
    PREPARING: { variant: 'warning', label: 'Preparing' },
    READY: { variant: 'success', label: 'Ready' },
    SERVED: { variant: 'success', label: 'Served' },
    COMPLETED: { variant: 'success', label: 'Completed' },
    CANCELLED: { variant: 'destructive', label: 'Cancelled' },
    AVAILABLE: { variant: 'success', label: 'Available' },
    OCCUPIED: { variant: 'destructive', label: 'Occupied' },
    RESERVED: { variant: 'warning', label: 'Reserved' },
    CLEANING: { variant: 'secondary', label: 'Cleaning' },
    UNPAID: { variant: 'destructive', label: 'Unpaid' },
    PAID: { variant: 'success', label: 'Paid' },
    PARTIAL: { variant: 'warning', label: 'Partial' },
    DRAFT: { variant: 'secondary', label: 'Draft' },
    APPROVED: { variant: 'success', label: 'Approved' },
  };

  const { variant, label } = config[status] || { variant: 'outline', label: status };
  return <Badge variant={variant}>{label}</Badge>;
}
