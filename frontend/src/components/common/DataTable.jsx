import { useState } from 'react';
import { Search, Plus, ChevronLeft, ChevronRight } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { TableSkeleton } from '@/components/ui/Skeleton';
import { EmptyState } from '@/components/ui/EmptyState';
import { Inbox } from 'lucide-react';
import { cn } from '@/lib/utils';

export function DataTable({
  columns,
  data = [],
  isLoading,
  pagination,
  onPageChange,
  onSearch,
  searchPlaceholder = 'Search...',
  onAdd,
  addLabel = 'Add New',
  emptyTitle = 'No data found',
  emptyDescription = 'Get started by creating a new item.',
  mobileCardRender,
}) {
  const [search, setSearch] = useState('');

  const handleSearch = (value) => {
    setSearch(value);
    onSearch?.(value);
  };

  if (isLoading) return <TableSkeleton rows={8} cols={columns.length} />;

  const visibleColumns = columns.filter((col) => !col.hideOnMobile);

  return (
    <div className="space-y-4">
      <div className="flex flex-col sm:flex-row gap-3 justify-between">
        {onSearch && (
          <div className="relative w-full sm:max-w-sm">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder={searchPlaceholder}
              value={search}
              onChange={(e) => handleSearch(e.target.value)}
              className="pl-9"
            />
          </div>
        )}
        {onAdd && (
          <Button onClick={onAdd} className="w-full sm:w-auto sm:ml-auto shrink-0">
            <Plus className="h-4 w-4" />
            {addLabel}
          </Button>
        )}
      </div>

      {data.length === 0 ? (
        <EmptyState
          icon={Inbox}
          title={emptyTitle}
          description={emptyDescription}
          action={onAdd && <Button onClick={onAdd}><Plus className="h-4 w-4" />{addLabel}</Button>}
        />
      ) : (
        <>
          {/* Mobile card layout */}
          <div className="grid gap-3 md:hidden">
            {data.map((row, i) => (
              mobileCardRender ? (
                <div key={row.id || i}>{mobileCardRender(row)}</div>
              ) : (
                <div
                  key={row.id || i}
                  className="rounded-xl border bg-card p-4 space-y-2 shadow-sm"
                >
                  {visibleColumns.slice(0, 4).map((col) => (
                    <div key={col.key} className="flex justify-between gap-3 text-sm">
                      <span className="text-muted-foreground shrink-0">{col.label}</span>
                      <span className="font-medium text-right truncate">
                        {col.render ? col.render(row) : row[col.key]}
                      </span>
                    </div>
                  ))}
                  {columns.find((c) => c.key === 'actions') && (
                    <div className="pt-2 border-t flex flex-wrap gap-2">
                      {columns.find((c) => c.key === 'actions').render(row)}
                    </div>
                  )}
                </div>
              )
            ))}
          </div>

          {/* Desktop table */}
          <div className="hidden md:block rounded-xl border overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b bg-muted/50">
                    {columns.map((col) => (
                      <th
                        key={col.key}
                        className={cn(
                          'px-4 py-3 text-left font-medium text-muted-foreground whitespace-nowrap',
                          col.className
                        )}
                      >
                        {col.label}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {data.map((row, i) => (
                    <tr key={row.id || i} className="border-b last:border-0 hover:bg-muted/30 transition-colors">
                      {columns.map((col) => (
                        <td key={col.key} className={cn('px-4 py-3', col.className)}>
                          {col.render ? col.render(row) : row[col.key]}
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </>
      )}

      {pagination && pagination.totalPages > 1 && (
        <div className="flex flex-col sm:flex-row items-center justify-between gap-3">
          <p className="text-sm text-muted-foreground text-center sm:text-left">
            Page {pagination.page} of {pagination.totalPages} ({pagination.total} items)
          </p>
          <div className="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              disabled={!pagination.hasPrev}
              onClick={() => onPageChange(pagination.page - 1)}
            >
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <Button
              variant="outline"
              size="sm"
              disabled={!pagination.hasNext}
              onClick={() => onPageChange(pagination.page + 1)}
            >
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
