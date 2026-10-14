import React, { useState, useMemo } from 'react';
import { ArrowUpDown, ChevronDown, ChevronRight, Download, Eye, Layers } from 'lucide-react';
import * as XLSX from 'xlsx';
import {
  IssueTypeBadge,
  TABLE,
  TABLE_BODY,
  TABLE_EMPTY_CELL,
  TABLE_FOOTER,
  TABLE_HEAD_ROW,
  TABLE_ROW,
  TABLE_TD,
  TABLE_TD_DATE,
  TABLE_TD_KEY,
  TABLE_TD_MONEY,
  TABLE_TD_MUTED,
  TABLE_TD_TIME,
  TABLE_TH,
  TABLE_TH_SORTABLE,
  TableCard
} from '@/components/DataTable';
import { IssueKeyLink } from '@/components/IssueKeyLink';
import { JiraWorklogItem } from '@/types';
import {
  formatCurrency,
  formatDate,
  secondsToDecimalHours,
  secondsToFormattedTime
} from '@/lib/timeUtils';

interface WorklogTableProps {
  worklogs: JiraWorklogItem[];
  hourlyRate: number;
  currency: string;
  onSelectIssue: (issue: JiraWorklogItem) => void;
}

type SortField = 'issue_key' | 'issue_summary' | 'issue_type' | 'status' | 'author' | 'started' | 'time_spent_seconds';
type SortOrder = 'asc' | 'desc';
type GroupByOption = 'none' | 'author' | 'epic' | 'issue_type' | 'date';

export const WorklogTable: React.FC<WorklogTableProps> = ({
  worklogs,
  hourlyRate,
  currency,
  onSelectIssue
}) => {
  const [sortField, setSortField] = useState<SortField>('started');
  const [sortOrder, setSortOrder] = useState<SortOrder>('desc');
  const [groupBy, setGroupBy] = useState<GroupByOption>('none');
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(25);
  const [collapsedGroups, setCollapsedGroups] = useState<Record<string, boolean>>({});

  // Sorting Handler
  const handleSort = (field: SortField) => {
    if (sortField === field) {
      setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortOrder('desc');
    }
  };

  // Sort worklogs
  const sortedWorklogs = useMemo(() => {
    return [...worklogs].sort((a, b) => {
      let valA: any = a[sortField] || '';
      let valB: any = b[sortField] || '';

      if (sortField === 'started') {
        valA = new Date(valA).getTime();
        valB = new Date(valB).getTime();
      } else if (sortField === 'time_spent_seconds') {
        valA = Number(valA);
        valB = Number(valB);
      } else {
        valA = String(valA).toLowerCase();
        valB = String(valB).toLowerCase();
      }

      if (valA < valB) return sortOrder === 'asc' ? -1 : 1;
      if (valA > valB) return sortOrder === 'asc' ? 1 : -1;
      return 0;
    });
  }, [worklogs, sortField, sortOrder]);

  // Group worklogs if requested
  const groupedWorklogs = useMemo(() => {
    if (groupBy === 'none') return null;

    const groups: Record<string, JiraWorklogItem[]> = {};

    sortedWorklogs.forEach(w => {
      let key = 'Other';
      if (groupBy === 'author') {
        key = w.author || 'Unassigned';
      } else if (groupBy === 'epic') {
        key = w.parent_1_summary || w.parent_2_summary || 'No epic / General';
      } else if (groupBy === 'issue_type') {
        key = w.issue_type || 'Task';
      } else if (groupBy === 'date') {
        key = w.started ? w.started.split('T')[0] : 'No date';
      }

      if (!groups[key]) groups[key] = [];
      groups[key].push(w);
    });

    return Object.entries(groups).map(([groupName, items]) => {
      const totalSeconds = items.reduce((acc, curr) => acc + curr.time_spent_seconds, 0);
      return {
        groupName,
        items,
        totalSeconds,
        totalHours: secondsToDecimalHours(totalSeconds),
        itemCount: items.length
      };
    });
  }, [sortedWorklogs, groupBy]);

  // Paginated rows for flat view
  const paginatedWorklogs = useMemo(() => {
    if (groupBy !== 'none') return sortedWorklogs;
    if (pageSize === 0) return sortedWorklogs; // All rows
    const start = (currentPage - 1) * pageSize;
    return sortedWorklogs.slice(start, start + pageSize);
  }, [sortedWorklogs, groupBy, currentPage, pageSize]);

  const totalPages = pageSize > 0 ? Math.ceil(sortedWorklogs.length / pageSize) : 1;

  const toggleGroupCollapse = (groupName: string) => {
    setCollapsedGroups(prev => ({ ...prev, [groupName]: !prev[groupName] }));
  };

  // Export Filtered Table Data to XLSX
  const exportToExcel = () => {
    const exportRows = sortedWorklogs.map(w => ({
      'Issue Key': w.issue_key,
      'Issue Summary': w.issue_summary,
      'Type': w.issue_type,
      'Status': w.status,
      'Author': w.author,
      'Author Email': w.author_email || '',
      'Time Spent (formatted)': w.time_spent,
      'Seconds': w.time_spent_seconds,
      'Hours (decimal)': secondsToDecimalHours(w.time_spent_seconds),
      [`Value (${currency})`]: secondsToDecimalHours(w.time_spent_seconds) * hourlyRate,
      'Started': w.started,
      'Version / Sprint': w.fix_versions || w.sprint || '',
      'Module / Epic': w.parent_1_summary || w.parent_2_summary || '',
      'Labels': w.labels || '',
      'Comment': w.comment || ''
    }));

    const ws = XLSX.utils.json_to_sheet(exportRows);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Jira Worklogs');
    XLSX.writeFile(wb, `Jira_Worklogs_Export_${new Date().toISOString().split('T')[0]}.xlsx`);
  };

  const renderRow = (item: JiraWorklogItem) => (
    <tr
      key={item.id}
      className={`${TABLE_ROW} group cursor-pointer`}
      onClick={() => onSelectIssue(item)}
    >
      <td className={TABLE_TD_KEY}>
        <IssueKeyLink issueKey={item.issue_key} />
      </td>
      <td className={`${TABLE_TD} max-w-md`}>
        <div className="font-medium text-slate-900 truncate">{item.issue_summary}</div>
        {(item.parent_1_summary || item.parent_2_summary) && (
          <div className="text-[11px] text-slate-400 truncate flex items-center gap-1 mt-0.5">
            <Layers className="w-3 h-3 text-slate-400" />
            <span>{item.parent_1_summary || item.parent_2_summary}</span>
          </div>
        )}
      </td>
      <td className={`${TABLE_TD} whitespace-nowrap`}>
        <IssueTypeBadge type={item.issue_type} />
      </td>
      <td className={TABLE_TD_MUTED}>{item.status}</td>
      <td className={`${TABLE_TD} whitespace-nowrap font-medium text-slate-800`}>{item.author}</td>
      <td className={TABLE_TD_DATE}>{formatDate(item.started)}</td>
      <td className={TABLE_TD_TIME}>{secondsToFormattedTime(item.time_spent_seconds)}</td>
      <td className={TABLE_TD_MONEY}>
        {formatCurrency(secondsToDecimalHours(item.time_spent_seconds) * hourlyRate, currency)}
      </td>
      <td className={`${TABLE_TD} text-center`}>
        <button
          onClick={e => {
            e.stopPropagation();
            onSelectIssue(item);
          }}
          className="p-1 rounded text-slate-400 hover:text-blue-600 hover:bg-blue-100/50 transition-colors"
        >
          <Eye className="w-3.5 h-3.5" />
        </button>
      </td>
    </tr>
  );

  const groupingControl = (
    <>
      <div className="flex items-center gap-1.5 bg-slate-50 border border-slate-200/80 rounded-lg px-2.5 py-1.5">
        <span className="text-slate-400 font-medium">Group by:</span>
        <select
          value={groupBy}
          onChange={e => {
            setGroupBy(e.target.value as GroupByOption);
            setCurrentPage(1);
          }}
          className="bg-transparent font-semibold text-slate-700 focus:outline-none cursor-pointer"
        >
          <option value="none">None (flat list)</option>
          <option value="author">By author</option>
          <option value="epic">By epic / module</option>
          <option value="issue_type">By issue type</option>
          <option value="date">By date</option>
        </select>
      </div>

      <button
        onClick={exportToExcel}
        className="px-3.5 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg font-semibold flex items-center gap-1.5 shadow-xs transition-all cursor-pointer"
        title="Download the filtered table as an Excel .xlsx file"
      >
        <Download className="w-3.5 h-3.5" />
        <span>Export .XLSX</span>
      </button>
    </>
  );

  const paginationFooter =
    groupBy === 'none' ? (
      <div className={TABLE_FOOTER}>
        <div className="flex items-center gap-2">
          <span>Rows per page:</span>
          <select
            value={pageSize}
            onChange={e => {
              setPageSize(Number(e.target.value));
              setCurrentPage(1);
            }}
            className="py-1 px-2 bg-white border border-slate-300 rounded focus:outline-none"
          >
            <option value={10}>10</option>
            <option value={25}>25</option>
            <option value={50}>50</option>
            <option value={100}>100</option>
            <option value={0}>All</option>
          </select>
          <span className="text-slate-400">(Results: {sortedWorklogs.length})</span>
        </div>

        {pageSize > 0 && totalPages > 1 && (
          <div className="flex items-center gap-1.5">
            <button
              disabled={currentPage === 1}
              onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
              className="px-2.5 py-1 bg-white border border-slate-300 rounded font-medium disabled:opacity-40 disabled:cursor-not-allowed hover:bg-slate-100 cursor-pointer"
            >
              Previous
            </button>
            <span className="px-2 font-mono text-slate-700">
              Page {currentPage} of {totalPages}
            </span>
            <button
              disabled={currentPage === totalPages}
              onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
              className="px-2.5 py-1 bg-white border border-slate-300 rounded font-medium disabled:opacity-40 disabled:cursor-not-allowed hover:bg-slate-100 cursor-pointer"
            >
              Next
            </button>
          </div>
        )}
      </div>
    ) : null;

  return (
    <TableCard
      title={`Recent Entries from Jira (${worklogs.length})`}
      subtitle="Detailed list of logged work with grouping and sorting"
      actions={groupingControl}
      footer={paginationFooter}
    >
      <table className={TABLE}>
          
          {/* Table Header */}
          <thead>
            <tr className={TABLE_HEAD_ROW}>
              <th
                onClick={() => handleSort('issue_key')}
                className={`${TABLE_TH_SORTABLE} w-28`}
              >
                <div className="flex items-center gap-1">
                  <span>Key</span>
                  <ArrowUpDown className="w-3 h-3 text-slate-400" />
                </div>
              </th>
              <th
                onClick={() => handleSort('issue_summary')}
                className={`${TABLE_TH_SORTABLE} min-w-[220px]`}
              >
                <div className="flex items-center gap-1">
                  <span>Issue Summary / Module</span>
                  <ArrowUpDown className="w-3 h-3 text-slate-400" />
                </div>
              </th>
              <th
                onClick={() => handleSort('issue_type')}
                className={`${TABLE_TH_SORTABLE} w-24`}
              >
                <div className="flex items-center gap-1">
                  <span>Type</span>
                  <ArrowUpDown className="w-3 h-3 text-slate-400" />
                </div>
              </th>
              <th
                onClick={() => handleSort('status')}
                className={`${TABLE_TH_SORTABLE} w-28`}
              >
                <div className="flex items-center gap-1">
                  <span>Status</span>
                  <ArrowUpDown className="w-3 h-3 text-slate-400" />
                </div>
              </th>
              <th
                onClick={() => handleSort('author')}
                className={`${TABLE_TH_SORTABLE} w-32`}
              >
                <div className="flex items-center gap-1">
                  <span>Author</span>
                  <ArrowUpDown className="w-3 h-3 text-slate-400" />
                </div>
              </th>
              <th
                onClick={() => handleSort('started')}
                className={`${TABLE_TH_SORTABLE} w-36`}
              >
                <div className="flex items-center gap-1">
                  <span>Entry date</span>
                  <ArrowUpDown className="w-3 h-3 text-slate-400" />
                </div>
              </th>
              <th
                onClick={() => handleSort('time_spent_seconds')}
                className={`${TABLE_TH_SORTABLE} text-right w-28`}
              >
                <div className="flex items-center justify-end gap-1">
                  <span>Time</span>
                  <ArrowUpDown className="w-3 h-3 text-slate-400" />
                </div>
              </th>
              <th className={`${TABLE_TH} text-right w-32`}>
                <span>Value</span>
              </th>
              <th className={`${TABLE_TH} text-center w-12`}>
                <span>Preview</span>
              </th>
            </tr>
          </thead>

          {/* Table Body */}
          <tbody className={TABLE_BODY}>
            {worklogs.length === 0 ? (
              <tr>
                <td colSpan={9} className={TABLE_EMPTY_CELL}>
                  No entries match the search criteria.
                </td>
              </tr>
            ) : groupBy !== 'none' && groupedWorklogs ? (
              
              /* Grouped View */
              groupedWorklogs.map(group => {
                const isCollapsed = collapsedGroups[group.groupName];
                const groupCost = group.totalHours * hourlyRate;

                return (
                  <React.Fragment key={group.groupName}>
                    {/* Group Header Row */}
                    <tr
                      onClick={() => toggleGroupCollapse(group.groupName)}
                      className="bg-slate-100/90 font-bold text-slate-800 hover:bg-slate-200/80 cursor-pointer border-t border-b border-slate-300 transition-colors"
                    >
                      <td colSpan={6} className={TABLE_TD}>
                        <div className="flex items-center gap-2">
                          {isCollapsed ? (
                            <ChevronRight className="w-4 h-4 text-slate-500" />
                          ) : (
                            <ChevronDown className="w-4 h-4 text-slate-500" />
                          )}
                          <span className="text-slate-900">{group.groupName}</span>
                          <span className="text-xs font-normal text-slate-500">
                            ({group.itemCount} entries)
                          </span>
                        </div>
                      </td>
                      <td className={`${TABLE_TD} text-right font-mono text-blue-700`}>
                        {secondsToFormattedTime(group.totalSeconds)}
                      </td>
                      <td className={`${TABLE_TD} text-right font-mono text-emerald-700`}>
                        {formatCurrency(groupCost, currency)}
                      </td>
                      <td />
                    </tr>

                    {/* Group Child Items */}
                    {!isCollapsed && group.items.map(renderRow)}
                  </React.Fragment>
                );
              })
            ) : (
              /* Flat View */
              paginatedWorklogs.map(renderRow)
            )}
          </tbody>
      </table>
    </TableCard>
  );
};
