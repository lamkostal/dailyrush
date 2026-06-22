import React, { useMemo } from 'react';
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  ReferenceLine,
  Line
} from 'recharts';
import { DailySelection, TrackMode } from './types';

interface HistoryChartProps {
  data: DailySelection[];
  mode: TrackMode;
  minValue: number;
  maxValue: number;
  trackName: string;
  showOriginalCurve: boolean;
  showLeastSquares: boolean;
  showEma: boolean;
}

type ChartPoint = DailySelection & {
  time: number;
  leastSquaresValue?: number;
  emaValue?: number;
};

const DAY_MS = 24 * 60 * 60 * 1000;

const parseLocalDate = (date: string) => {
  const [year, month, day] = date.split('-').map(Number);
  return new Date(year, month - 1, day).getTime();
};

const getLevelLabel = (value: number, minValue: number, maxValue: number) => {
  const span = Math.max(maxValue - minValue, 1);
  const ratio = (value - minValue) / span;
  if (ratio <= 0.2) return 'Low';
  if (ratio <= 0.4) return 'Building';
  if (ratio <= 0.6) return 'Steady';
  if (ratio <= 0.8) return 'Strong';
  return 'Peak';
};

const makeTicks = (minValue: number, maxValue: number, mode: TrackMode) => {
  if (mode === 'point') return [0, 1];

  const span = Math.max(maxValue - minValue, 1);
  if (span <= 5) {
    return Array.from({ length: span + 1 }, (_, index) => minValue + index);
  }

  return Array.from(
    new Set(Array.from({ length: 6 }, (_, index) => Math.round(minValue + (span * index) / 5)))
  );
};

const addLeastSquaresValues = (points: ChartPoint[]) => {
  if (points.length < 2) return points;

  const origin = points[0].time;
  const values = points.map((point) => ({
    x: (point.time - origin) / DAY_MS,
    y: point.value
  }));
  const count = values.length;
  const sumX = values.reduce((sum, point) => sum + point.x, 0);
  const sumY = values.reduce((sum, point) => sum + point.y, 0);
  const sumXY = values.reduce((sum, point) => sum + point.x * point.y, 0);
  const sumXX = values.reduce((sum, point) => sum + point.x * point.x, 0);
  const denominator = count * sumXX - sumX * sumX;

  if (denominator === 0) return points;

  const slope = (count * sumXY - sumX * sumY) / denominator;
  const intercept = (sumY - slope * sumX) / count;

  return points.map((point) => ({
    ...point,
    leastSquaresValue: intercept + slope * ((point.time - origin) / DAY_MS)
  }));
};

const addEmaValues = (points: ChartPoint[]) => {
  if (points.length < 2) return points;

  const alpha = 0.35;
  let previousEma = points[0].value;

  return points.map((point, index) => {
    const emaValue = index === 0
      ? point.value
      : alpha * point.value + (1 - alpha) * previousEma;

    previousEma = emaValue;

    return {
      ...point,
      emaValue
    };
  });
};

const CustomTooltip = ({ active, payload, mode, minValue, maxValue, trackName }: any) => {
  if (active && payload && payload.length) {
    const data: ChartPoint = payload[0].payload;
    const date = new Date(data.time).toLocaleDateString('en-GB', {
      weekday: 'long',
      month: 'short',
      day: 'numeric'
    }).replace(',', '');
    const ratio = (data.value - minValue) / Math.max(maxValue - minValue, 1);

    return (
      <div className="bg-white p-3 border border-slate-200 shadow-2xl rounded-2xl max-w-xs">
        <p className="text-[10px] font-bold text-slate-400 tracking-widest mb-2 border-b border-slate-50 pb-1">{date}</p>
        <div className="flex items-center gap-3 mb-2">
          <div className={`w-8 h-8 rounded-lg flex items-center justify-center text-white font-bold text-lg ${mode === 'point' ? 'bg-emerald-500' : ratio > 0.7 ? 'bg-green-500' : ratio > 0.3 ? 'bg-indigo-500' : 'bg-orange-500'}`}>
            {mode === 'point' ? '✓' : data.value}
          </div>
          <div>
            <p className="text-xs font-semibold text-slate-400 uppercase tracking-tighter">{trackName}</p>
            <p className="text-sm font-black text-slate-800">
              {mode === 'point' ? 'Logged' : getLevelLabel(data.value, minValue, maxValue)}
            </p>
          </div>
        </div>
        {data.note && (
          <p className="text-xs text-slate-600 leading-relaxed italic border-t border-slate-50 pt-2">
            "{data.note}"
          </p>
        )}
      </div>
    );
  }
  return null;
};

const HistoryChart: React.FC<HistoryChartProps> = ({ data, mode, minValue, maxValue, trackName, showOriginalCurve, showLeastSquares, showEma }) => {
  const chartData = useMemo<ChartPoint[]>(() => {
    const sortedPoints = data
      .map((entry) => ({
        ...entry,
        time: parseLocalDate(entry.date)
      }))
      .sort((a, b) => a.time - b.time);

    const emaPoints = showEma ? addEmaValues(sortedPoints) : sortedPoints;
    return showLeastSquares ? addLeastSquaresValues(emaPoints) : emaPoints;
  }, [data, showLeastSquares, showEma]);

  const xDomain = useMemo<[number, number]>(() => {
    if (chartData.length === 1) {
      return [chartData[0].time - DAY_MS, chartData[0].time + DAY_MS];
    }

    return [
      Math.min(...chartData.map((entry) => entry.time)),
      Math.max(...chartData.map((entry) => entry.time))
    ];
  }, [chartData]);

  const yDomain: [number, number] = mode === 'point' ? [0, 1] : [minValue, maxValue];
  const yTicks = makeTicks(minValue, maxValue, mode);
  const lineColor = mode === 'point' ? '#10b981' : '#4f46e5';

  const formatXAxis = (tickItem: number) => {
    const d = new Date(tickItem);
    return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  };

  const formatYAxis = (tickItem: number) => {
    if (mode === 'point') return tickItem === 1 ? 'Log' : '';
    return String(tickItem);
  };

  return (
    <div className="w-full h-[320px] sm:h-[340px]">
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart
          data={chartData}
          margin={{ top: 8, right: 8, left: -28, bottom: 0 }}
        >
          <defs>
            <linearGradient id="colorValue" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor={lineColor} stopOpacity={0.2}/>
              <stop offset="95%" stopColor={lineColor} stopOpacity={0}/>
            </linearGradient>
          </defs>
          <CartesianGrid
            strokeDasharray="3 3"
            vertical={false}
            stroke="#f1f5f9"
          />
          <XAxis
            dataKey="time"
            type="number"
            scale="time"
            domain={xDomain}
            tickFormatter={formatXAxis}
            axisLine={false}
            tickLine={false}
            tick={{ fill: '#cbd5e1', fontSize: 11, fontWeight: 600 }}
            dy={10}
            minTickGap={30}
          />
          <YAxis
            domain={yDomain}
            ticks={yTicks}
            tickFormatter={formatYAxis}
            axisLine={false}
            tickLine={false}
            tick={{ fill: '#cbd5e1', fontSize: 11, fontWeight: 600 }}
          />
          <Tooltip
            content={<CustomTooltip mode={mode} minValue={minValue} maxValue={maxValue} trackName={trackName} />}
            cursor={{ stroke: '#e2e8f0', strokeWidth: 2 }}
          />
          {mode === 'score' && (
            <ReferenceLine y={minValue + (maxValue - minValue) / 2} stroke="#f1f5f9" strokeDasharray="3 3" />
          )}
          {showOriginalCurve && (
            <Area
              type="monotone"
              dataKey="value"
              stroke={lineColor}
              strokeWidth={4}
              dot={mode === 'point'
                ? { r: 7, strokeWidth: 4, stroke: '#ffffff', fill: lineColor }
                : { r: 4, strokeWidth: 3, stroke: '#ffffff', fill: lineColor }}
              fillOpacity={1}
              fill="url(#colorValue)"
              animationDuration={1000}
              activeDot={mode === 'point'
                ? { r: 11, strokeWidth: 0, fill: lineColor }
                : { r: 8, strokeWidth: 0, fill: lineColor }}
            />
          )}
          {showEma && chartData.length > 1 && (
            <Line
              type="monotone"
              dataKey="emaValue"
              name="EMA"
              stroke="#0d9488"
              strokeWidth={3}
              dot={false}
              activeDot={false}
              isAnimationActive={false}
            />
          )}
          {showLeastSquares && chartData.length > 1 && (
            <Line
              type="linear"
              dataKey="leastSquaresValue"
              name="Least squares"
              stroke="#f97316"
              strokeWidth={3}
              strokeDasharray="7 5"
              dot={false}
              activeDot={false}
              isAnimationActive={false}
            />
          )}
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
};

export default HistoryChart;
