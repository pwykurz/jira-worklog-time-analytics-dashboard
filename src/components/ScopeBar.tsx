import React, { useEffect, useMemo, useState } from 'react';
import { ChevronDown, Plus, SlidersHorizontal } from 'lucide-react';
import { JiraProject } from '@/api/projects';
import { JiraWorklogItem } from '@/types';
import { OptionBox, OptionPicker } from '@/components/OptionPicker';
import { uniqueLabels } from '@/lib/labels';
import {
  formatScopeChips,
  PDF_COLUMN_LABELS,
  PdfColumnId,
  ReportScope
} from '@/lib/reportScope';

interface ScopeBarProps {
  kind: 'time' | 'worklog' | 'missing';
  scope: ReportScope;
  projects: JiraProject[];
  worklogs: JiraWorklogItem[];
  /** Values from data that is not worklogs (the "missing worklogs" report). */
  extraStatuses?: string[];
  extraLabels?: string[];
  extraAuthors?: string[];
  extraEpics?: string[];
  extraTypes?: string[];
  onChange: (scope: ReportScope) => void;
}

function toggleValue(list: string[], value: string): string[] {
  return list.includes(value) ? list.filter(item => item !== value) : [...list, value];
}

function toggleLabel(list: string[], value: string): string[] {
  const key = value.trim().toLowerCase();
  if (!key) {
    return list;
  }
  if (list.some(item => item.toLowerCase() === key)) {
    return list.filter(item => item.toLowerCase() !== key);
  }
  return [...list, value.trim()];
}

/** Selected values must stay visible even when they are absent from the period's data. */
function withSelected(options: string[], selected: string[]): string[] {
  const missing = selected.filter(value => !options.includes(value));
  return [...missing, ...options];
}

function withSelectedLabels(options: string[], selected: string[]): string[] {
  const known = new Set(options.map(option => option.toLowerCase()));
  const missing = selected.filter(label => !known.has(label.toLowerCase()));
  return [...missing, ...options];
}

function filtersOpenKey(kind: ScopeBarProps['kind']): string {
  return `jira-report-filters-open-${kind}`;
}

export const ScopeBar: React.FC<ScopeBarProps> = ({
  kind,
  scope,
  projects,
  worklogs,
  extraStatuses = [],
  extraLabels = [],
  extraAuthors = [],
  extraEpics = [],
  extraTypes = [],
  onChange
}) => {
  const [labelDraft, setLabelDraft] = useState('');
  const [filtersOpen, setFiltersOpen] = useState(() => {
    try {
      return localStorage.getItem(filtersOpenKey(kind)) === '1';
    } catch {
      return false;
    }
  });

  useEffect(() => {
    try {
      localStorage.setItem(filtersOpenKey(kind), filtersOpen ? '1' : '0');
    } catch {
      /* private browsing — the collapsed state is not critical */
    }
  }, [filtersOpen, kind]);

  const labels = useMemo(
    () =>
      withSelectedLabels(
        uniqueLabels([...worklogs.map(item => item.labels), ...extraLabels]),
        scope.labels
      ),
    [extraLabels, scope.labels, worklogs]
  );
  const epics = useMemo(() => {
    const fromData = [
      ...new Set(
        [
          ...worklogs.map(item => item.parent_1_summary || item.parent_2_summary),
          ...extraEpics
        ].filter(Boolean) as string[]
      )
    ].sort();
    return withSelected(fromData, scope.epics);
  }, [extraEpics, scope.epics, worklogs]);
  const types = useMemo(() => {
    const names: string[] = [];
    for (const item of worklogs) {
      if (item.issue_type) {
        names.push(String(item.issue_type));
      }
    }
    for (const name of extraTypes) {
      if (name) {
        names.push(String(name));
      }
    }
    return withSelected([...new Set(names)].sort(), scope.issueTypes);
  }, [extraTypes, scope.issueTypes, worklogs]);
  const authors = useMemo(() => {
    const names: string[] = [];
    for (const item of worklogs) {
      if (item.author) {
        names.push(String(item.author));
      }
    }
    for (const name of extraAuthors) {
      if (name) {
        names.push(String(name));
      }
    }
    return withSelected([...new Set(names)].sort(), scope.authors);
  }, [extraAuthors, scope.authors, worklogs]);
  const statuses = useMemo(
    () =>
      withSelected(
        [
          ...new Set(
            ['To Do', 'Closed', ...worklogs.map(item => item.status), ...extraStatuses].filter(Boolean)
          )
        ].sort(),
        scope.excludedStatuses
      ),
    [extraStatuses, scope.excludedStatuses, worklogs]
  );
  const projectOptions = useMemo(() => {
    const known = new Set(projects.map(project => project.key));
    const extras = scope.projectKeys
      .filter(key => !known.has(key))
      .map(key => ({ id: `scope-${key}`, key, name: 'previously selected' }));
    return [...extras, ...projects];
  }, [projects, scope.projectKeys]);

  const activeFilterCount =
    scope.projectKeys.length +
    scope.labels.length +
    scope.epics.length +
    scope.issueTypes.length +
    scope.authors.length +
    (kind === 'missing' ? scope.excludedStatuses.length : 0);
  const activeSummary = formatScopeChips(scope).join(' · ');

  const addLabelDraft = () => {
    const value = labelDraft.trim();
    if (!value) {
      return;
    }
    onChange({ ...scope, labels: toggleLabel(scope.labels, value) });
    setLabelDraft('');
  };

  return (
    <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-4 mb-6 space-y-3">
      <div className="flex flex-wrap items-center gap-3">
        <button
          type="button"
          onClick={() => setFiltersOpen(open => !open)}
          aria-expanded={filtersOpen}
          className="flex items-center gap-2 px-3 py-2 rounded-lg text-xs font-semibold text-slate-700 hover:bg-slate-100 cursor-pointer transition-colors"
        >
          <SlidersHorizontal className="w-4 h-4 text-blue-500" />
          Filters
          {activeFilterCount > 0 ? (
            <span className="px-1.5 py-0.5 rounded-full bg-blue-100 text-blue-700 text-[11px]">
              {activeFilterCount}
            </span>
          ) : null}
          <ChevronDown
            className={`w-4 h-4 text-slate-400 transition-transform ${filtersOpen ? 'rotate-180' : ''}`}
          />
        </button>
        {!filtersOpen ? (
          <p className="min-w-0 flex-1 truncate text-xs text-slate-500" title={activeSummary}>
            {activeSummary}
          </p>
        ) : null}
      </div>

      <div
        className={`grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3 ${filtersOpen ? '' : 'hidden'}`}
      >
        <OptionPicker
          title="Projects"
          options={projectOptions.map(project => ({
            value: project.key,
            searchText: `${project.key} ${project.name}`,
            label: (
              <>
                <span className="font-mono font-semibold">{project.key}</span>
                <span className="text-slate-500"> — {project.name}</span>
              </>
            )
          }))}
          isChecked={value => scope.projectKeys.includes(value)}
          onToggle={value => onChange({ ...scope, projectKeys: toggleValue(scope.projectKeys, value) })}
          allOption={{
            label: 'All',
            active: scope.projectKeys.length === 0,
            onSelect: () => onChange({ ...scope, projectKeys: [] })
          }}
          onClear={() => onChange({ ...scope, projectKeys: [] })}
          searchPlaceholder="Search projects…"
        />

        <OptionPicker
          title="Labels"
          options={labels.map(label => ({ value: label }))}
          isChecked={value => scope.labels.some(item => item.toLowerCase() === value.toLowerCase())}
          onToggle={value => onChange({ ...scope, labels: toggleLabel(scope.labels, value) })}
          onClear={() => onChange({ ...scope, labels: [] })}
          selectedCount={scope.labels.length}
          searchPlaceholder="Search labels…"
          emptyText="No labels in the data — add one below."
          footer={
            <div className="flex gap-2">
              <input
                value={labelDraft}
                onChange={event => setLabelDraft(event.target.value)}
                className="flex-1 min-w-0 border border-slate-300 rounded-lg px-3 py-1.5 text-xs"
                placeholder="e.g. Maintenance"
                onKeyDown={event => {
                  if (event.key === 'Enter') {
                    event.preventDefault();
                    addLabelDraft();
                  }
                }}
              />
              <button
                type="button"
                onClick={addLabelDraft}
                disabled={!labelDraft.trim()}
                className="px-3 py-1.5 rounded-lg bg-slate-800 text-white text-xs font-semibold flex items-center gap-1 disabled:opacity-40 cursor-pointer"
              >
                <Plus className="w-3.5 h-3.5" />
                Add
              </button>
            </div>
          }
        />

        <OptionPicker
          title={kind === 'missing' ? 'People (assignee)' : 'Authors'}
          options={authors.map(author => ({ value: author }))}
          isChecked={value => scope.authors.includes(value)}
          onToggle={value =>
            onChange({ ...scope, authors: toggleValue(scope.authors, value) })
          }
          allOption={{
            label: 'Everyone',
            active: scope.authors.length === 0,
            onSelect: () => onChange({ ...scope, authors: [] })
          }}
          onClear={() => onChange({ ...scope, authors: [] })}
          searchPlaceholder="Search people…"
          emptyText="No people in the period's data."
        />

        {kind === 'missing' ? (
          <OptionPicker
            title="Excluded statuses"
            options={statuses.map(status => ({ value: status }))}
            isChecked={value => scope.excludedStatuses.includes(value)}
            onToggle={value =>
              onChange({ ...scope, excludedStatuses: toggleValue(scope.excludedStatuses, value) })
            }
            onClear={() => onChange({ ...scope, excludedStatuses: [] })}
            searchPlaceholder="Search statuses…"
          />
        ) : null}

        <OptionPicker
          title="Epics"
          options={epics.map(epic => ({ value: epic }))}
          isChecked={value => scope.epics.includes(value)}
          onToggle={value => onChange({ ...scope, epics: toggleValue(scope.epics, value) })}
          onClear={() => onChange({ ...scope, epics: [] })}
          searchPlaceholder="Search epics…"
          emptyText="No epics in the period's data."
        />

        <OptionPicker
          title="Issue type"
          options={types.map(type => ({ value: type }))}
          isChecked={value => scope.issueTypes.includes(value)}
          onToggle={value => onChange({ ...scope, issueTypes: toggleValue(scope.issueTypes, value) })}
          onClear={() => onChange({ ...scope, issueTypes: [] })}
          searchPlaceholder="Search types…"
          emptyText="No types in the period's data."
        />

        {kind === 'time' ? (
          <OptionBox title="PDF overhead">
            <div className="flex flex-wrap gap-3">
              <label className="flex items-center gap-2 text-[13px] text-slate-700">
                QA %
                <input
                  type="number"
                  min={0}
                  className="w-20 border border-slate-300 rounded-lg px-2.5 py-2 text-[13px]"
                  value={scope.qaPercent}
                  onChange={event => onChange({ ...scope, qaPercent: Number(event.target.value) || 0 })}
                />
              </label>
              <label className="flex items-center gap-2 text-[13px] text-slate-700">
                PO %
                <input
                  type="number"
                  min={0}
                  className="w-20 border border-slate-300 rounded-lg px-2.5 py-2 text-[13px]"
                  value={scope.poPercent}
                  onChange={event => onChange({ ...scope, poPercent: Number(event.target.value) || 0 })}
                />
              </label>
            </div>
          </OptionBox>
        ) : null}

        <OptionPicker
          title="PDF columns"
          options={(Object.keys(PDF_COLUMN_LABELS) as PdfColumnId[]).map(column => ({
            value: column,
            label: PDF_COLUMN_LABELS[column]
          }))}
          isChecked={value => scope.columns.includes(value as PdfColumnId)}
          onToggle={value =>
            onChange({
              ...scope,
              columns: toggleValue(scope.columns, value) as ReportScope['columns']
            })
          }
          selectedCount={scope.columns.length}
          searchThreshold={Object.keys(PDF_COLUMN_LABELS).length}
        />
      </div>
    </div>
  );
};
