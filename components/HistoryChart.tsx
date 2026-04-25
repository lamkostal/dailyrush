
import React from 'react';
import { 
  AreaChart, 
  Area, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer,
  ReferenceLine
} from 'recharts';
import { DailySelection } from '../types';

interface HistoryChartProps {
  data: DailySelection[];
}

const CustomTooltip = ({ active, payload, label }: any) => {
  if (active && payload && payload.length) {
    const data: DailySelection = payload[0].payload;
    const date = new Date(data.date).toLocaleDateString('en-US', { 
      month: 'short', 
      day: 'numeric', 
      year: 'numeric' 
    });
    return (
      <div className="bg-white p-4 border border-slate-200 shadow-2xl rounded-2xl max-w-xs">
        <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-2 border-b border-slate-50 pb-1">{date}</p>
        <div className="flex items-center gap-3 mb-3">
          <div className={`w-8 h-8 rounded-lg flex items-center justify-center text-white font-bold text-lg ${data.value > 7 ? 'bg-green-500' : data.value > 4 ? 'bg-indigo-500' : 'bg-orange-500'}`}>
            {data.value}
          </div>
          <div>
            <p className="text-xs font-semibold text-slate-400 uppercase tracking-tighter">Daily Score</p>
            <p className="text-sm font-black text-slate-800">
              {data.value === 10 ? 'Exceptional' : data.value > 7 ? 'Great' : data.value > 4 ? 'Stable' : 'Difficult'}
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

const HistoryChart: React.FC<HistoryChartProps> = ({ data }) => {
  const formatXAxis = (tickItem: string) => {
    const d = new Date(tickItem);
    return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  };

  return (
    <div className="w-full h-[350px]">
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart
          data={data}
          margin={{ top: 10, right: 10, left: -25, bottom: 0 }}
        >
          <defs>
            <linearGradient id="colorValue" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor="#4f46e5" stopOpacity={0.2}/>
              <stop offset="95%" stopColor="#4f46e5" stopOpacity={0}/>
            </linearGradient>
          </defs>
          <CartesianGrid 
            strokeDasharray="3 3" 
            vertical={false} 
            stroke="#f1f5f9" 
          />
          <XAxis 
            dataKey="date" 
            tickFormatter={formatXAxis}
            axisLine={false}
            tickLine={false}
            tick={{ fill: '#cbd5e1', fontSize: 11, fontWeight: 600 }}
            dy={10}
            minTickGap={30}
          />
          <YAxis 
            domain={[0, 10]} 
            ticks={[0, 2, 4, 6, 8, 10]}
            axisLine={false}
            tickLine={false}
            tick={{ fill: '#cbd5e1', fontSize: 11, fontWeight: 600 }}
          />
          <Tooltip content={<CustomTooltip />} cursor={{ stroke: '#e2e8f0', strokeWidth: 2 }} />
          <ReferenceLine y={5} stroke="#f1f5f9" strokeDasharray="3 3" />
          <Area 
            type="monotone" 
            dataKey="value" 
            stroke="#4f46e5" 
            strokeWidth={4}
            fillOpacity={1} 
            fill="url(#colorValue)" 
            animationDuration={1000}
            activeDot={{ r: 8, strokeWidth: 0, fill: '#4f46e5' }}
          />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
};

export default HistoryChart;
