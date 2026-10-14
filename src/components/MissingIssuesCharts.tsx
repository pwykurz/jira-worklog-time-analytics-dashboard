import React from 'react';
import { BarChart, Bar, CartesianGrid, Cell, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { ChartsAccordion } from '@/components/ChartsAccordion';
import { MissingIssue } from '@/api/issues';

interface MissingIssuesChartsProps {
  issues: MissingIssue[];
}

const COLORS = ['#3b82f6', '#10b981', '#f59e0b', '#8b5cf6', '#ec4899', '#06b6d4', '#64748b'];

function countBy(issues: MissingIssue[], pick: (issue: MissingIssue) => string) {
  const counts = new Map<string, number>();
  for (const issue of issues) {
    const key = pick(issue) || 'None';
    counts.set(key, (counts.get(key) || 0) + 1);
  }
  return [...counts.entries()]
    .map(([name, count]) => ({ name, count }))
    .sort((a, b) => b.count - a.count);
}

const TOOLTIP_STYLE = {
  backgroundColor: '#0f172a',
  borderColor: '#1e293b',
  borderRadius: '12px',
  color: '#fff',
  fontSize: '12px'
};

/** The "missing worklogs" report has no time to show, so it counts issues instead. */
export const MissingIssuesCharts: React.FC<MissingIssuesChartsProps> = ({ issues }) => {
  const byStatus = countBy(issues, issue => issue.status);
  const byAssignee = countBy(issues, issue => issue.assignee).slice(0, 8);

  return (
    <ChartsAccordion subtitle="Number of issues without worklogs by status and assignee">
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white p-6 rounded-2xl border border-slate-100 shadow-sm">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-sm font-semibold text-slate-900">Issues by status</h3>
            <span className="text-xs text-slate-400 font-medium">{byStatus.length} statuses</span>
          </div>
          <div className="h-64 w-full">
            {byStatus.length === 0 ? (
              <div className="h-full flex items-center justify-center text-xs text-slate-400">
                No data to chart
              </div>
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={byStatus} margin={{ top: 10, right: 10, left: -20, bottom: 20 }}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                  <XAxis dataKey="name" tick={{ fontSize: 11, fill: '#64748b' }} interval={0} />
                  <YAxis tick={{ fontSize: 11, fill: '#64748b' }} allowDecimals={false} />
                  <Tooltip formatter={(value: any) => [`${value}`, 'Issues']} contentStyle={TOOLTIP_STYLE} />
                  <Bar dataKey="count" radius={[6, 6, 0, 0]}>
                    {byStatus.map((entry, index) => (
                      <Cell key={entry.name} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            )}
          </div>
        </div>

        <div className="bg-white p-6 rounded-2xl border border-slate-100 shadow-sm">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-sm font-semibold text-slate-900">Issues by assignee</h3>
            <span className="text-xs text-slate-400 font-medium">Top {byAssignee.length}</span>
          </div>
          <div className="h-64 w-full">
            {byAssignee.length === 0 ? (
              <div className="h-full flex items-center justify-center text-xs text-slate-400">
                No data to chart
              </div>
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart
                  data={byAssignee}
                  layout="vertical"
                  margin={{ top: 10, right: 20, left: 20, bottom: 10 }}
                >
                  <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#f1f5f9" />
                  <XAxis type="number" tick={{ fontSize: 11, fill: '#64748b' }} allowDecimals={false} />
                  <YAxis
                    dataKey="name"
                    type="category"
                    tick={{ fontSize: 10, fill: '#334155' }}
                    width={130}
                  />
                  <Tooltip formatter={(value: any) => [`${value}`, 'Issues']} contentStyle={TOOLTIP_STYLE} />
                  <Bar dataKey="count" fill="#8b5cf6" radius={[0, 6, 6, 0]} />
                </BarChart>
              </ResponsiveContainer>
            )}
          </div>
        </div>
      </div>
    </ChartsAccordion>
  );
};
