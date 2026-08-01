import { useQuery } from '@tanstack/react-query';
import { motion } from 'framer-motion';
import { Clock, ChefHat } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Thumbnail } from '@/components/ui/Thumbnail';
import { StatusBadge } from '@/components/ui/Badge';
import { ordersApi } from '@/lib/api';
import { resolveMenuImageUrl } from '@/lib/images';
import { formatDateTime } from '@/lib/utils';
import { useTenantQueryEnabled, useTenantQueryKey } from '@/hooks/useTenantQueryKey';

export default function KitchenPage() {
  const tenantEnabled = useTenantQueryEnabled();
  const { data, isLoading, refetch } = useQuery({
    queryKey: useTenantQueryKey('kitchen-queue'),
    queryFn: () => ordersApi.getKitchenQueue().then((r) => r.data.data),
    refetchInterval: 5000,
    enabled: tenantEnabled,
  });

  const updateItemStatus = async (orderId, itemId, status) => {
    await ordersApi.updateItemStatus(orderId, itemId, status);
    refetch();
  };

  if (isLoading) {
    return (
      <div className="grid gap-4 grid-cols-1 sm:grid-cols-2 xl:grid-cols-3">
        {Array.from({ length: 6 }).map((_, i) => (
          <div key={i} className="h-48 animate-pulse bg-muted rounded-xl" />
        ))}
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <ChefHat className="h-8 w-8 shrink-0" />
        <div>
          <h1 className="text-xl sm:text-2xl font-bold">Kitchen Queue</h1>
          <p className="text-muted-foreground text-sm">{data?.length || 0} active orders</p>
        </div>
      </div>

      {!data?.length ? (
        <div className="text-center py-16 text-muted-foreground">
          <ChefHat className="h-12 w-12 mx-auto mb-4 opacity-50" />
          <p>No orders in kitchen queue</p>
        </div>
      ) : (
        <div className="grid gap-4 grid-cols-1 sm:grid-cols-2 xl:grid-cols-3">
          {data.map((order, i) => (
            <motion.div
              key={order.id}
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: i * 0.05 }}
            >
              <Card className="border-l-4 border-l-amber-500 h-full">
                <CardHeader className="pb-3">
                  <div className="flex justify-between items-start gap-2">
                    <CardTitle className="text-base truncate">{order.orderNumber}</CardTitle>
                    <StatusBadge status={order.status} />
                  </div>
                  <div className="flex flex-wrap items-center gap-2 text-sm text-muted-foreground">
                    <Clock className="h-3 w-3 shrink-0" />
                    {formatDateTime(order.createdAt)}
                    {order.table && <span>• Table {order.table.number}</span>}
                  </div>
                </CardHeader>
                <CardContent className="space-y-3">
                  {order.items.map((item) => (
                    <div key={item.id} className="flex flex-col sm:flex-row sm:items-center gap-3 p-2 rounded-lg bg-muted/50">
                      <div className="flex items-center gap-3 min-w-0 flex-1">
                        <Thumbnail
                          src={resolveMenuImageUrl(
                            item.menuItem?.name,
                            item.menuItem?.category?.name,
                            item.menuItem?.image,
                            80,
                            80
                          )}
                          alt={item.menuItem?.name}
                          fallbackName={item.menuItem?.name}
                          category={item.menuItem?.category?.name}
                          size="sm"
                          rounded="lg"
                        />
                        <div className="min-w-0">
                          <p className="font-medium text-sm truncate">{item.menuItem.name}</p>
                          <p className="text-xs text-muted-foreground">Qty: {item.quantity}</p>
                        </div>
                      </div>
                      <div className="flex gap-1 shrink-0">
                        {item.status !== 'PREPARING' && (
                          <Button size="sm" variant="outline" className="flex-1 sm:flex-none" onClick={() => updateItemStatus(order.id, item.id, 'PREPARING')}>
                            Start
                          </Button>
                        )}
                        {item.status !== 'READY' && (
                          <Button size="sm" className="flex-1 sm:flex-none" onClick={() => updateItemStatus(order.id, item.id, 'READY')}>
                            Ready
                          </Button>
                        )}
                      </div>
                    </div>
                  ))}
                </CardContent>
              </Card>
            </motion.div>
          ))}
        </div>
      )}
    </div>
  );
}
