import { useState } from 'react';
import { LayoutGrid, List } from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/Button';
import { GenericCrudPage, tableColumns, tableFormFields } from '@/pages/GenericCrudPage';
import { tablesApi } from '@/lib/api';
import { StatusBadge } from '@/components/ui/Badge';

const STATUS_STYLES = {
  AVAILABLE: 'border-emerald-500/50 bg-emerald-500/10',
  OCCUPIED: 'border-red-500/50 bg-red-500/10',
  RESERVED: 'border-amber-500/50 bg-amber-500/10',
  CLEANING: 'border-blue-500/50 bg-blue-500/10',
};

export default function TablesPage() {
  const [view, setView] = useState('grid');
  const { data: tablesRes, isLoading } = useQuery({
    queryKey: ['tables', 'all'],
    queryFn: () => tablesApi.getAll({ limit: 50 }).then((r) => r.data),
  });
  const tables = tablesRes?.data || [];

  if (view === 'grid') {
    return (
      <div className="space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold">Tables</h1>
            <p className="text-muted-foreground">Floor plan — {tables.length} tables</p>
          </div>
          <div className="flex gap-2">
            <Button variant="default" size="icon" onClick={() => setView('grid')}><LayoutGrid className="h-4 w-4" /></Button>
            <Button variant="outline" size="icon" onClick={() => setView('table')}><List className="h-4 w-4" /></Button>
          </div>
        </div>

        {isLoading ? (
          <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-5 xl:grid-cols-8 gap-3">
            {Array.from({ length: 16 }).map((_, i) => (
              <div key={i} className="h-24 animate-pulse bg-muted rounded-xl" />
            ))}
          </div>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-5 xl:grid-cols-8 gap-3">
            {tables.map((t) => (
              <div
                key={t.id}
                className={cn(
                  'rounded-xl border-2 p-4 text-center transition-transform hover:scale-[1.02]',
                  STATUS_STYLES[t.status] || 'border-border bg-card'
                )}
              >
                <p className="text-2xl font-bold">#{t.number}</p>
                <p className="text-xs text-muted-foreground mt-1">{t.capacity} seats</p>
                <StatusBadge status={t.status} />
                {t.location && <p className="text-[10px] text-muted-foreground mt-1 truncate">{t.location}</p>}
              </div>
            ))}
          </div>
        )}

        <div className="flex flex-wrap gap-3 text-xs text-muted-foreground">
          {Object.keys(STATUS_STYLES).map((s) => (
            <span key={s} className="flex items-center gap-1">
              <span className={cn('h-2 w-2 rounded-full border', STATUS_STYLES[s])} />
              {s}
            </span>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex justify-end gap-2">
        <Button variant="outline" size="icon" onClick={() => setView('grid')}><LayoutGrid className="h-4 w-4" /></Button>
        <Button variant="default" size="icon" onClick={() => setView('table')}><List className="h-4 w-4" /></Button>
      </div>
      <GenericCrudPage
        title="Tables"
        description="Manage restaurant tables and seating"
        api={tablesApi}
        queryKey="tables"
        columns={tableColumns}
        formFields={tableFormFields}
      />
    </div>
  );
}
