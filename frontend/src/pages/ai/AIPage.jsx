import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import {
  Brain, TrendingDown, RefreshCw, DollarSign, Clock, Trash2, Lightbulb,
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { Label } from '@/components/ui/Label';
import { aiApi, menuItemsApi } from '@/lib/api';

const features = [
  { key: 'shortage', label: 'Shortage Prediction', icon: TrendingDown, fn: () => aiApi.predictShortages() },
  { key: 'reorder', label: 'Stock Reorder', icon: RefreshCw, fn: () => aiApi.recommendStock() },
  { key: 'pricing', label: 'Menu Pricing', icon: DollarSign, fn: () => aiApi.menuPricing() },
  { key: 'prep', label: 'Prep Time', icon: Clock, fn: null },
  { key: 'waste', label: 'Waste Analysis', icon: Trash2, fn: () => aiApi.wasteAnalysis() },
  { key: 'insights', label: 'Business Insights', icon: Lightbulb, fn: () => aiApi.getInsights() },
];

function ConfidenceBadge({ value }) {
  if (value == null) return null;
  const pct = typeof value === 'number' ? Math.round(value * 100) : value;
  const variant = pct >= 75 ? 'success' : pct >= 50 ? 'warning' : 'destructive';
  return <Badge variant={variant}>{pct}% confidence</Badge>;
}

function ResultCard({ title, subtitle, badges = [], children }) {
  return (
    <div className="p-4 rounded-lg border space-y-2">
      <div className="flex flex-wrap justify-between gap-2 items-start">
        <div>
          <p className="font-medium">{title}</p>
          {subtitle && <p className="text-sm text-muted-foreground">{subtitle}</p>}
        </div>
        <div className="flex flex-wrap gap-1">{badges}</div>
      </div>
      {children}
    </div>
  );
}

export default function AIPage() {
  const [activeFeature, setActiveFeature] = useState('shortage');
  const [result, setResult] = useState(null);
  const [loading, setLoading] = useState(false);
  const [selectedMenuItem, setSelectedMenuItem] = useState('');

  const { data: menuItems } = useQuery({
    queryKey: ['menu-items-ai'],
    queryFn: () => menuItemsApi.getAll({ limit: 100 }).then((r) => r.data.data || r.data),
    enabled: activeFeature === 'prep',
  });

  const selectFeature = (feature) => {
    setActiveFeature(feature.key);
    setResult(null);
    if (feature.key === 'prep') return;
    runAnalysis(feature);
  };

  const runAnalysis = async (feature) => {
    if (feature.key === 'prep') {
      if (!selectedMenuItem) {
        setResult({ error: 'Select a menu item first' });
        return;
      }
      setLoading(true);
      try {
        const response = await aiApi.preparationTime(selectedMenuItem);
        setResult(response.data.data);
      } catch (err) {
        setResult({ error: err.response?.data?.message || 'AI service unavailable' });
      } finally {
        setLoading(false);
      }
      return;
    }

    setLoading(true);
    try {
      const response = await feature.fn();
      setResult(response.data.data);
    } catch (err) {
      setResult({ error: err.response?.data?.message || 'AI service unavailable' });
    } finally {
      setLoading(false);
    }
  };

  const renderResults = () => {
    if (loading) {
      return (
        <div className="space-y-3">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-20 animate-pulse bg-muted rounded-xl" />
          ))}
        </div>
      );
    }
    if (!result) return <p className="text-muted-foreground text-center py-8">Select an analysis to run</p>;
    if (result.error) return <p className="text-destructive text-center py-4">{result.error}</p>;

    if (result.predictions?.length) {
      return result.predictions.map((p, i) => (
        <ResultCard
          key={i}
          title={p.ingredient || p.ingredientName}
          subtitle={`${p.currentStock ?? p.daysRemaining} — ${p.daysRemaining} days remaining`}
          badges={[
            <Badge key="risk" variant={p.riskLevel === 'high' || p.risk === 'high' ? 'destructive' : p.riskLevel === 'medium' || p.risk === 'medium' ? 'warning' : 'success'}>
              {p.riskLevel || p.risk}
            </Badge>,
            <ConfidenceBadge key="conf" value={p.predictionConfidence || p.confidence} />,
          ]}
        >
          <p className="text-sm">{p.recommendation || p.recommendedAction}</p>
          {p.dailyUsage != null && (
            <p className="text-xs text-muted-foreground mt-1">
              Avg daily usage: {p.dailyUsage} {p.unit || ''} from live order & recipe data
            </p>
          )}
          {p.reasoning && <p className="text-xs text-muted-foreground mt-1">{p.reasoning}</p>}
        </ResultCard>
      ));
    }

    if (result.recommendations?.length && activeFeature === 'pricing') {
      return result.recommendations.map((r, i) => (
        <ResultCard
          key={i}
          title={r.menuItem || r.name}
          badges={[
            <Badge key="p">₹{r.suggestedPrice}</Badge>,
            <ConfidenceBadge key="c" value={r.confidence} />,
          ]}
        >
          <p className="text-sm">Margin: {r.profitMargin}% · Food cost: {r.foodCostPercent}%</p>
          <p className="text-sm text-muted-foreground">{r.pricingExplanation || r.reason}</p>
        </ResultCard>
      ));
    }

    if (result.recommendations?.length) {
      return result.recommendations.map((r, i) => (
        <ResultCard
          key={i}
          title={r.name || r.menuItem || r.ingredient}
          badges={[
            r.urgency && <Badge key="u" variant={r.urgency === 'urgent' ? 'destructive' : 'secondary'}>{r.urgency}</Badge>,
            <ConfidenceBadge key="c" value={r.confidence} />,
          ]}
        >
          {r.suggestedPrice != null && (
            <p className="text-sm">Suggested: ₹{r.suggestedPrice} (current ₹{r.currentPrice})</p>
          )}
          {r.recommendedQuantity != null && (
            <p className="text-sm">Reorder: {r.recommendedQuantity} {r.unit || 'units'}</p>
          )}
          <p className="text-sm text-muted-foreground">{r.reason || r.recommendation}</p>
        </ResultCard>
      ));
    }

    if (result.estimatedTimeMinutes != null || result.estimatedTime != null || result.predictedPrepTime != null) {
      const est = result.estimatedTimeMinutes ?? result.estimatedTime ?? result.predictedPrepTime;
      return (
        <ResultCard
          title={result.menuItem || 'Preparation Time'}
          badges={[
            <Badge key="t">{est} min</Badge>,
            result.difficulty && <Badge key="d" variant="secondary">{result.difficulty}</Badge>,
          ]}
        >
          <p className="text-sm text-muted-foreground">{result.reason || result.reasoning}</p>
        </ResultCard>
      );
    }

    if (result.analysis?.length) {
      return result.analysis.map((a, i) => (
        <ResultCard
          key={i}
          title={a.item || a.ingredient}
          badges={[
            a.wastePercent != null && <Badge key="w" variant="warning">{a.wastePercent}% waste</Badge>,
            a.lossAmount != null && <Badge key="l" variant="destructive">₹{a.lossAmount} loss</Badge>,
          ]}
        >
          <p className="text-sm">{a.recommendation}</p>
        </ResultCard>
      ));
    }

    if (result.insights?.length) {
      return result.insights.map((ins, i) => (
        <ResultCard key={i} title={ins.title} subtitle={ins.category}>
          <p className="text-sm text-muted-foreground">{ins.description}</p>
        </ResultCard>
      ));
    }

    if (result.summary) {
      return (
        <ResultCard title="Summary">
          <p className="text-sm">{result.summary}</p>
        </ResultCard>
      );
    }

    return <pre className="text-xs overflow-auto max-h-96 p-3 bg-muted rounded-lg">{JSON.stringify(result, null, 2)}</pre>;
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <Brain className="h-8 w-8 text-primary" />
        <div>
          <h1 className="text-2xl font-bold">AI Center</h1>
          <p className="text-muted-foreground">Predictions, pricing, waste analysis & business insights</p>
        </div>
      </div>

      <div className="grid gap-3 grid-cols-2 md:grid-cols-3 lg:grid-cols-6">
        {features.map((f) => (
          <Button
            key={f.key}
            variant={activeFeature === f.key ? 'default' : 'outline'}
            className="h-auto py-4 flex-col gap-2"
            onClick={() => selectFeature(f)}
          >
            <f.icon className="h-5 w-5" />
            <span className="text-xs text-center leading-tight">{f.label}</span>
          </Button>
        ))}
      </div>

      {activeFeature === 'prep' && (
        <Card>
          <CardContent className="pt-6">
            <Label htmlFor="menu-item">Menu Item</Label>
            <select
              id="menu-item"
              className="mt-2 w-full max-w-md rounded-md border bg-background px-3 py-2 text-sm"
              value={selectedMenuItem}
              onChange={(e) => setSelectedMenuItem(e.target.value)}
            >
              <option value="">Select menu item...</option>
              {(menuItems || []).map((item) => (
                <option key={item.id} value={item.id}>{item.name}</option>
              ))}
            </select>
            <Button className="mt-3" disabled={!selectedMenuItem || loading} onClick={() => runAnalysis(features.find((f) => f.key === 'prep'))}>
              Estimate Prep Time
            </Button>
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            Results
            {loading && <span className="text-sm font-normal text-muted-foreground animate-pulse">Analyzing...</span>}
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">{renderResults()}</CardContent>
      </Card>
    </div>
  );
}
