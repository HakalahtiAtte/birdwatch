'use client'

import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
} from 'recharts'

type ChartPoint = { date: string; count: number }

export function ActivityChart({ data }: { data: ChartPoint[] }) {
  return (
    <ResponsiveContainer width="100%" height={160}>
      <AreaChart data={data} margin={{ top: 4, right: 4, left: -24, bottom: 0 }}>
        <defs>
          <linearGradient id="birdGreen" x1="0" y1="0" x2="0" y2="1">
            <stop offset="5%" stopColor="#16a34a" stopOpacity={0.2} />
            <stop offset="95%" stopColor="#16a34a" stopOpacity={0} />
          </linearGradient>
        </defs>
        <XAxis
          dataKey="date"
          tick={{ fontSize: 11, fill: '#9ca3af' }}
          tickLine={false}
          axisLine={false}
          tickFormatter={(v: string) => {
            const d = new Date(v)
            return `${d.getDate()}/${d.getMonth() + 1}`
          }}
          interval="preserveStartEnd"
        />
        <YAxis
          tick={{ fontSize: 11, fill: '#9ca3af' }}
          tickLine={false}
          axisLine={false}
          allowDecimals={false}
        />
        <Tooltip
          contentStyle={{
            background: '#fff',
            border: '1px solid #e5e7eb',
            borderRadius: 8,
            fontSize: 12,
          }}
          labelFormatter={(v) =>
            new Date(String(v)).toLocaleDateString(undefined, {
              day: 'numeric',
              month: 'short',
            })
          }
          formatter={(value: number) => [value, 'sightings']}
        />
        <Area
          type="monotone"
          dataKey="count"
          stroke="#16a34a"
          strokeWidth={2}
          fill="url(#birdGreen)"
          dot={false}
          activeDot={{ r: 4, fill: '#16a34a' }}
        />
      </AreaChart>
    </ResponsiveContainer>
  )
}
