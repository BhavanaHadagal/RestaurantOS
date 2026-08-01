import { useQuery } from '@tanstack/react-query';
import { motion } from 'framer-motion';
import { Link } from 'react-router-dom';
import {
  TrendingUp, ShoppingBag, Users, AlertTriangle,
  DollarSign, Package, Percent, ChefHat, CreditCard,
} from 'lucide-react';
import {
  AreaChart, Area, BarChart, Bar, LineChart, Line,
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell,
} from 'recharts';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card';
import { DashboardSkeleton } from '@/components/ui/Skeleton';
import { Button } from '@/components/ui/Button';
import { dashboardApi, ordersApi } from '@/lib/api';
import { formatCurrency } from '@/lib/utils';
import { Thumbnail } from '@/components/ui/Thumbnail';
import { getFoodImageUrl } from '@/lib/images';
import { canViewDashboardSection } from '@/lib/rbac';
import { useAuthStore } from '@/stores/authStore';

const COLORS = ['#6366f1', '#8b5cf6', '#a855f7', '#d946ef', '#ec4899'];

const chartAxis = {
  tick: { fontSize: 12, fill: 'hsl(var(--muted-foreground))' },
  axisLine: { stroke: 'hsl(var(--border))' },
  tickLine: { stroke: 'hsl(var(--border))' },
};

const chartGrid = { strokeDasharray: '3 3', stroke: 'hsl(var(--border))' };

function ChartEmpty({ message = 'No data for this period' }) {
  return (
    <div className="flex h-64 items-center justify-center rounded-lg border border-dashed border-border text-sm text-muted-foreground">
      {message}
    </div>
  );
}

function StatCard({ title, value, subtitle, icon: Icon }) {
  return (
    <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
      <Card>
        <CardContent className="p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-muted-foreground">{title}</p>
              <p className="text-2xl font-bold mt-1">{value}</p>
              {subtitle && <p className="text-xs text-muted-foreground mt-1">{subtitle}</p>}
            </div>
            <div className="h-12 w-12 rounded-xl bg-primary/10 flex items-center justify-center">
              <Icon className="h-6 w-6 text-primary" />
            </div>
          </div>
        </CardContent>
      </Card>
    </motion.div>
  );
}

export default function DashboardPage() {
  const { user, permissions } = useAuthStore();
  const role = user?.role?.name;
  const can = (section) => canViewDashboardSection(section, permissions, role);

  const { data: stats, isLoading: statsLoading } = useQuery({
    queryKey: ['dashboard-stats', user?.id],
    queryFn: () => dashboardApi.getStats().then((r) => r.data.data),
    refetchInterval: 60000,
    enabled: !!user?.id && (can('orders') || can('revenue')),
  });

  const { data: charts, isLoading: chartsLoading } = useQuery({
    queryKey: ['dashboard-charts', user?.id],
    queryFn: () => dashboardApi.getCharts('month').then((r) => r.data.data),
    enabled: !!user?.id && can('charts'),
  });

  const { data: kitchenQueue } = useQuery({
    queryKey: ['kitchen-queue-dash', user?.id],
    queryFn: () => ordersApi.getKitchenQueue().then((r) => r.data.data),
    refetchInterval: 10000,
    enabled: !!user?.id && can('kitchen'),
  });

  if (statsLoading && (can('orders') || can('revenue'))) return <DashboardSkeleton />;

  const titles = {
    Owner: 'Business Overview',
    Manager: 'Operations Dashboard',
    Chef: 'Kitchen Dashboard',
    Waiter: 'Service Dashboard',
    Cashier: 'Billing Dashboard',
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">{titles[role] || 'Dashboard'}</h1>
        <p className="text-muted-foreground">
          Welcome back, {user?.firstName}. Here&apos;s your {role?.toLowerCase()} view.
        </p>
      </div>

      {/* Kitchen view for Chef */}
      {can('kitchen') && (
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle className="flex items-center gap-2">
              <ChefHat className="h-5 w-5" /> Active Kitchen Orders
            </CardTitle>
            <Link to="/kitchen"><Button size="sm">Open Kitchen</Button></Link>
          </CardHeader>
          <CardContent>
            {!kitchenQueue?.length ? (
              <p className="text-muted-foreground text-sm py-4 text-center">No orders in queue</p>
            ) : (
              <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                {kitchenQueue.slice(0, 6).map((order) => (
                  <div key={order.id} className="rounded-lg border p-3">
                    <p className="font-medium">{order.orderNumber}</p>
                    <p className="text-xs text-muted-foreground">{order.items?.length} items · {order.status}</p>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Operations stats (non-Cashier — Cashier has a dedicated billing view below) */}
      {role !== 'Cashier' && (can('revenue') || can('orders') || can('occupancy')) && (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          {can('revenue') && (
            <StatCard
              title="Monthly Revenue"
              value={formatCurrency(stats?.salesOverview?.monthlyRevenue)}
              subtitle={`${stats?.salesOverview?.todayOrders || 0} completed orders today`}
              icon={TrendingUp}
            />
          )}
          {can('orders') && (
            <StatCard title="Active Orders" value={stats?.activeOrders || 0} icon={ShoppingBag} />
          )}
          {can('occupancy') && (
            <StatCard
              title="Table Occupancy"
              value={`${stats?.tableOccupancy?.percentage || 0}%`}
              subtitle={`${stats?.tableOccupancy?.occupied}/${stats?.tableOccupancy?.total} tables`}
              icon={Users}
            />
          )}
          {(can('revenue') || can('occupancy')) && (
            <StatCard title="Low Stock Items" value={stats?.lowStock || 0} icon={AlertTriangle} />
          )}
        </div>
      )}

      {can('billing') && role === 'Cashier' && (
        <div className="grid gap-4 md:grid-cols-2">
          <StatCard
            title="Monthly Revenue"
            value={formatCurrency(stats?.salesOverview?.monthlyRevenue)}
            subtitle={`${stats?.salesOverview?.todayOrders || 0} completed orders today`}
            icon={CreditCard}
          />
          <StatCard title="Active Orders" value={stats?.activeOrders || 0} icon={ShoppingBag} />
        </div>
      )}

      {/* Financial stats - Owner/Manager only */}
      {(can('expenses') || can('purchases') || can('profit')) && (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          {can('expenses') && (
            <StatCard title="Monthly Expenses" value={formatCurrency(stats?.monthlyExpenses)} icon={DollarSign} />
          )}
          {can('purchases') && (
            <StatCard title="Purchases" value={formatCurrency(stats?.purchaseSummary)} icon={Package} />
          )}
          {can('profit') && (
            <StatCard title="Profit" value={formatCurrency(stats?.profit)} icon={Percent} />
          )}
        </div>
      )}

      {/* Charts - Owner/Manager */}
      {can('charts') && (
        <div className="grid gap-4 md:grid-cols-2">
          <Card>
            <CardHeader><CardTitle>Revenue Trend</CardTitle></CardHeader>
            <CardContent>
              {chartsLoading ? (
                <div className="h-64 animate-pulse bg-muted rounded" />
              ) : !(charts?.revenue || []).length ? (
                <ChartEmpty message="No revenue in the last 30 days" />
              ) : (
                <ResponsiveContainer width="100%" height={280}>
                  <AreaChart data={charts.revenue}>
                    <CartesianGrid {...chartGrid} />
                    <XAxis dataKey="date" {...chartAxis} />
                    <YAxis {...chartAxis} />
                    <Tooltip
                      formatter={(v) => formatCurrency(v)}
                      contentStyle={{
                        background: 'hsl(var(--card))',
                        border: '1px solid hsl(var(--border))',
                        borderRadius: '8px',
                        color: 'hsl(var(--foreground))',
                      }}
                    />
                    <Area type="monotone" dataKey="value" stroke="#818cf8" fill="#6366f1" fillOpacity={0.25} />
                  </AreaChart>
                </ResponsiveContainer>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader><CardTitle>Orders</CardTitle></CardHeader>
            <CardContent>
              {chartsLoading ? (
                <div className="h-64 animate-pulse bg-muted rounded" />
              ) : !(charts?.orders || []).length ? (
                <ChartEmpty message="No orders in the last 30 days" />
              ) : (
                <ResponsiveContainer width="100%" height={280}>
                  <BarChart data={charts.orders}>
                    <CartesianGrid {...chartGrid} />
                    <XAxis dataKey="date" {...chartAxis} />
                    <YAxis {...chartAxis} />
                    <Tooltip
                      contentStyle={{
                        background: 'hsl(var(--card))',
                        border: '1px solid hsl(var(--border))',
                        borderRadius: '8px',
                        color: 'hsl(var(--foreground))',
                      }}
                    />
                    <Bar dataKey="value" fill="#a78bfa" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              )}
            </CardContent>
          </Card>

          {can('profit') && (
            <Card>
              <CardHeader><CardTitle>Expenses vs Profit</CardTitle></CardHeader>
              <CardContent>
                {chartsLoading ? (
                  <div className="h-64 animate-pulse bg-muted rounded" />
                ) : !(charts?.profit || []).length ? (
                  <ChartEmpty message="No profit data in the last 30 days" />
                ) : (
                  <ResponsiveContainer width="100%" height={280}>
                    <LineChart data={charts.profit}>
                      <CartesianGrid {...chartGrid} />
                      <XAxis dataKey="date" {...chartAxis} />
                      <YAxis {...chartAxis} />
                      <Tooltip
                        formatter={(v) => formatCurrency(v)}
                        contentStyle={{
                          background: 'hsl(var(--card))',
                          border: '1px solid hsl(var(--border))',
                          borderRadius: '8px',
                          color: 'hsl(var(--foreground))',
                        }}
                      />
                      <Line type="monotone" dataKey="value" stroke="#34d399" strokeWidth={2} dot={false} />
                    </LineChart>
                  </ResponsiveContainer>
                )}
              </CardContent>
            </Card>
          )}

          <Card>
            <CardHeader><CardTitle>Top Selling Menu</CardTitle></CardHeader>
            <CardContent className="space-y-4">
              {chartsLoading ? (
                <div className="h-64 animate-pulse bg-muted rounded" />
              ) : !(charts?.topSellingMenu || []).length ? (
                <ChartEmpty message="No menu sales in the last 30 days" />
              ) : (
                <>
                  <div className="space-y-2 max-h-[140px] overflow-y-auto">
                    {charts.topSellingMenu.slice(0, 5).map((item) => (
                      <div key={item.name} className="flex items-center gap-3">
                        <Thumbnail
                          src={getFoodImageUrl(item.name, 80, 80)}
                          alt={item.name}
                          fallbackName={item.name}
                          size="sm"
                          rounded="lg"
                        />
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium truncate">{item.name}</p>
                          <p className="text-xs text-muted-foreground">{item.quantity} orders</p>
                        </div>
                      </div>
                    ))}
                  </div>
                  <ResponsiveContainer width="100%" height={200}>
                    <PieChart>
                      <Pie
                        data={charts.topSellingMenu}
                        dataKey="quantity"
                        nameKey="name"
                        cx="50%"
                        cy="50%"
                        outerRadius={70}
                        label={false}
                      >
                        {charts.topSellingMenu.map((_, i) => (
                          <Cell key={i} fill={COLORS[i % COLORS.length]} />
                        ))}
                      </Pie>
                      <Tooltip
                        contentStyle={{
                          background: 'hsl(var(--card))',
                          border: '1px solid hsl(var(--border))',
                          borderRadius: '8px',
                          color: 'hsl(var(--foreground))',
                        }}
                      />
                    </PieChart>
                  </ResponsiveContainer>
                </>
              )}
            </CardContent>
          </Card>
        </div>
      )}

      {/* Waiter quick links */}
      {role === 'Waiter' && (
        <div className="flex gap-3">
          <Link to="/tables"><Button variant="outline">View Tables</Button></Link>
          <Link to="/orders"><Button>Create Order</Button></Link>
        </div>
      )}
    </div>
  );
}
