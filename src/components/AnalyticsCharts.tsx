import React from 'react';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  Cell,
  PieChart,
  Pie,
  AreaChart,
  Area,
  CartesianGrid
} from 'recharts';
import { ChartsAccordion } from '@/components/ChartsAccordion';
import { JiraWorklogItem } from '@/types';
import { secondsToDecimalHours, secondsToFormattedTime, formatDateShort } from '@/lib/timeUtils';

interface AnalyticsChartsProps {
  worklogs: JiraWorklogItem[];
}

const COLORS = ['#3b82f6', '#10b981', '#f59e0b', '#8b5cf6', '#ec4899', '#06b6d4', '#64748b'];

export const AnalyticsCharts: React.FC<AnalyticsChartsProps> = ({ worklogs }) => {
  // 1. Author breakdown
  const authorDataMap = new Map<string, number>();
  worklogs.forEach(w => {
    const author = w.author || 'Unassigned';
    authorDataMap.set(author, (authorDataMap.get(author) || 0) + w.time_spent_seconds);
  });

  const authorChartData = Array.from(authorDataMap.entries())
    .map(([name, seconds]) => ({
      name,
      hours: secondsToDecimalHours(seconds),
      formatted: secondsToFormattedTime(seconds)
    }))
    .sort((a, b) => b.hours - a.hours);

  // 2. Issue Type breakdown
  const typeDataMap = new Map<string, number>();
  worklogs.forEach(w => {
    const type = w.issue_type || 'Task';
    typeDataMap.set(type, (typeDataMap.get(type) || 0) + w.time_spent_seconds);
  });

  const typeChartData = Array.from(typeDataMap.entries())
    .map(([name, seconds]) => ({
      name,
      hours: secondsToDecimalHours(seconds),
      formatted: secondsToFormattedTime(seconds)
    }))
    .sort((a, b) => b.hours - a.hours);

  // 3. Epic breakdown
  const epicDataMap = new Map<string, number>();
  worklogs.forEach(w => {
    const epic = w.parent_1_summary || w.parent_2_summary || 'Other / General';
    const shortEpic = epic.length > 25 ? epic.substring(0, 25) + '...' : epic;
    epicDataMap.set(shortEpic, (epicDataMap.get(shortEpic) || 0) + w.time_spent_seconds);
  });

  const epicChartData = Array.from(epicDataMap.entries())
    .map(([name, seconds]) => ({
      name,
      hours: secondsToDecimalHours(seconds),
      formatted: secondsToFormattedTime(seconds)
    }))
    .sort((a, b) => b.hours - a.hours);

  // 4. Timeline trend (grouped by date YYYY-MM-DD)
  const timelineDataMap = new Map<string, number>();
  worklogs.forEach(w => {
    const dateKey = formatDateShort(w.started);
    timelineDataMap.set(dateKey, (timelineDataMap.get(dateKey) || 0) + w.time_spent_seconds);
  });

  const timelineChartData = Array.from(timelineDataMap.entries())
    .map(([date, seconds]) => ({
      date,
      hours: secondsToDecimalHours(seconds),
      formatted: secondsToFormattedTime(seconds)
    }))
    .sort((a, b) => a.date.localeCompare(b.date));

  return (
    <ChartsAccordion subtitle="Time split by author, activity over time, issue types and epics">
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          
          {/* Chart 1: Author Hours Distribution */}
          <div className="bg-white p-6 rounded-2xl border border-slate-100 shadow-sm">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-sm font-semibold text-slate-900">Time by Author / Team</h3>
              <span className="text-xs text-slate-400 font-medium">{authorChartData.length} members</span>
            </div>
            <div className="h-64 w-full">
              {authorChartData.length === 0 ? (
                <div className="h-full flex items-center justify-center text-xs text-slate-400">No data to chart</div>
              ) : (
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={authorChartData} margin={{ top: 10, right: 10, left: -20, bottom: 20 }}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                    <XAxis dataKey="name" tick={{ fontSize: 11, fill: '#64748b' }} interval={0} />
                    <YAxis tick={{ fontSize: 11, fill: '#64748b' }} unit="h" />
                    <Tooltip
                      formatter={(val: any, name: any, item: any) => [`${val} h (${item.payload.formatted})`, 'Time']}
                      contentStyle={{ backgroundColor: '#0f172a', borderColor: '#1e293b', borderRadius: '12px', color: '#fff', fontSize: '12px' }}
                    />
                    <Bar dataKey="hours" radius={[6, 6, 0, 0]}>
                      {authorChartData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              )}
            </div>
          </div>

          {/* Chart 2: Timeline Worklog Activity */}
          <div className="bg-white p-6 rounded-2xl border border-slate-100 shadow-sm">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-sm font-semibold text-slate-900">Activity over time (days)</h3>
              <span className="text-xs text-slate-400 font-medium">{timelineChartData.length} days with entries</span>
            </div>
            <div className="h-64 w-full">
              {timelineChartData.length === 0 ? (
                <div className="h-full flex items-center justify-center text-xs text-slate-400">No timeline data</div>
              ) : (
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={timelineChartData} margin={{ top: 10, right: 10, left: -20, bottom: 20 }}>
                    <defs>
                      <linearGradient id="colorHours" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.4} />
                        <stop offset="95%" stopColor="#3b82f6" stopOpacity={0.0} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                    <XAxis dataKey="date" tick={{ fontSize: 10, fill: '#64748b' }} />
                    <YAxis tick={{ fontSize: 11, fill: '#64748b' }} unit="h" />
                    <Tooltip
                      formatter={(val: any, name: any, item: any) => [`${val} h (${item.payload.formatted})`, 'Time']}
                      contentStyle={{ backgroundColor: '#0f172a', borderColor: '#1e293b', borderRadius: '12px', color: '#fff', fontSize: '12px' }}
                    />
                    <Area type="monotone" dataKey="hours" stroke="#3b82f6" strokeWidth={2} fillOpacity={1} fill="url(#colorHours)" />
                  </AreaChart>
                </ResponsiveContainer>
              )}
            </div>
          </div>

          {/* Chart 3: Issue Type Donut */}
          <div className="bg-white p-6 rounded-2xl border border-slate-100 shadow-sm">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-sm font-semibold text-slate-900">Breakdown by Issue Type</h3>
              <span className="text-xs text-slate-400 font-medium">Bug vs Story vs Subtask</span>
            </div>
            <div className="h-60 w-full flex items-center justify-center">
              {typeChartData.length === 0 ? (
                <div className="text-xs text-slate-400">No issue type data</div>
              ) : (
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={typeChartData}
                      cx="50%"
                      cy="50%"
                      innerRadius={55}
                      outerRadius={85}
                      paddingAngle={4}
                      dataKey="hours"
                      label={({ name, percent }) => `${name} (${(percent * 100).toFixed(0)}%)`}
                      labelLine={false}
                    >
                      {typeChartData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip
                      formatter={(val: any, name: any, item: any) => [`${val} h (${item.payload.formatted})`, 'Time']}
                      contentStyle={{ backgroundColor: '#0f172a', borderColor: '#1e293b', borderRadius: '12px', color: '#fff', fontSize: '12px' }}
                    />
                  </PieChart>
                </ResponsiveContainer>
              )}
            </div>
          </div>

          {/* Chart 4: Top Epics / Projects Horizontal Bar */}
          <div className="bg-white p-6 rounded-2xl border border-slate-100 shadow-sm">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-sm font-semibold text-slate-900">Time spent per Epic / Module</h3>
              <span className="text-xs text-slate-400 font-medium">Top projects</span>
            </div>
            <div className="h-60 w-full">
              {epicChartData.length === 0 ? (
                <div className="h-full flex items-center justify-center text-xs text-slate-400">No epics</div>
              ) : (
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={epicChartData.slice(0, 5)} layout="vertical" margin={{ top: 10, right: 20, left: 20, bottom: 10 }}>
                    <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#f1f5f9" />
                    <XAxis type="number" tick={{ fontSize: 11, fill: '#64748b' }} unit="h" />
                    <YAxis dataKey="name" type="category" tick={{ fontSize: 10, fill: '#334155' }} width={120} />
                    <Tooltip
                      formatter={(val: any, name: any, item: any) => [`${val} h (${item.payload.formatted})`, 'Time']}
                      contentStyle={{ backgroundColor: '#0f172a', borderColor: '#1e293b', borderRadius: '12px', color: '#fff', fontSize: '12px' }}
                    />
                    <Bar dataKey="hours" fill="#8b5cf6" radius={[0, 6, 6, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              )}
            </div>
          </div>

      </div>
    </ChartsAccordion>
  );
};
