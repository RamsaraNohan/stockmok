import {
  Bar,
  BarChart,
  CartesianGrid,
  LabelList,
  ResponsiveContainer,
  XAxis,
  YAxis,
} from 'recharts';

import type { PurchaseOrderStatusCount } from '@/services/reports/reportService';

export interface PurchaseOrderStatusChartProps {
  readonly counts: readonly PurchaseOrderStatusCount[];
}

export default function PurchaseOrderStatusChart({ counts }: PurchaseOrderStatusChartProps) {
  const chartData = counts.map(({ key, label, count }) => ({ key, label, count }));

  return (
    <figure
      aria-labelledby="purchase-order-status-chart-title"
      className="rounded-panel border border-border bg-surface p-4 shadow-sm"
    >
      <figcaption
        className="mb-4 text-sm font-bold text-text"
        id="purchase-order-status-chart-title"
      >
        Purchase orders by status family
      </figcaption>
      <div aria-hidden="true" className="h-[280px] w-full min-w-0">
        <ResponsiveContainer height="100%" width="100%">
          <BarChart
            data={chartData}
            layout="vertical"
            margin={{ top: 4, right: 36, bottom: 4, left: 12 }}
          >
            <CartesianGrid horizontal={false} stroke="var(--color-border)" />
            <XAxis
              allowDecimals={false}
              axisLine={false}
              domain={[0, 'dataMax + 1']}
              type="number"
            />
            <YAxis axisLine={false} dataKey="label" tickLine={false} type="category" width={76} />
            <Bar
              dataKey="count"
              fill="var(--color-primary)"
              isAnimationActive={false}
              maxBarSize={28}
              radius={[0, 4, 4, 0]}
            >
              <LabelList dataKey="count" fill="var(--color-text)" position="right" />
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>
    </figure>
  );
}
