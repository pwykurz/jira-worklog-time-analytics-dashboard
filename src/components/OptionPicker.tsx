import React, { useMemo, useState } from 'react';
import { Search } from 'lucide-react';
import { CheckOption } from '@/components/CheckOption';

interface OptionBoxProps {
  title: string;
  count?: number;
  onClear?: () => void;
  /** Element below the heading, e.g. a search box. */
  header?: React.ReactNode;
  footer?: React.ReactNode;
  children: React.ReactNode;
}

/** Shared shell for the boxes in the scope bar — same height and the same heading. */
export const OptionBox: React.FC<OptionBoxProps> = ({
  title,
  count = 0,
  onClear,
  header,
  footer,
  children
}) => (
  <div className="flex flex-col h-64 border border-slate-200 rounded-xl p-3">
    <div className="flex items-center justify-between gap-2 mb-2">
      <p className="text-xs font-semibold uppercase tracking-wide text-slate-700">
        {title}
        {count > 0 ? <span className="ml-1.5 text-blue-600 normal-case">({count})</span> : null}
      </p>
      {onClear && count > 0 ? (
        <button
          type="button"
          onClick={onClear}
          className="text-[11px] font-medium text-slate-400 hover:text-slate-700 cursor-pointer"
        >
          Clear
        </button>
      ) : null}
    </div>
    {header}
    <div className="flex-1 min-h-0 overflow-y-auto space-y-0.5 pr-0.5">{children}</div>
    {footer ? <div className="pt-2">{footer}</div> : null}
  </div>
);

export interface OptionPickerItem {
  value: string;
  label?: React.ReactNode;
  searchText?: string;
}

interface OptionPickerProps {
  title: string;
  options: OptionPickerItem[];
  isChecked: (value: string) => boolean;
  onToggle: (value: string) => void;
  /** An "All" / "Everyone" option pinned to the top of the list. */
  allOption?: { label: string; active: boolean; onSelect: () => void };
  onClear?: () => void;
  selectedCount?: number;
  searchPlaceholder?: string;
  emptyText?: string;
  footer?: React.ReactNode;
  /** Below this number of options a search box only takes up space. */
  searchThreshold?: number;
}

export const OptionPicker: React.FC<OptionPickerProps> = ({
  title,
  options,
  isChecked,
  onToggle,
  allOption,
  onClear,
  selectedCount,
  searchPlaceholder = 'Search…',
  emptyText = 'No options in the period\'s data.',
  footer,
  searchThreshold = 7
}) => {
  const [query, setQuery] = useState('');

  const filtered = useMemo(() => {
    const needle = query.trim().toLowerCase();
    const matched = needle
      ? options.filter(option => (option.searchText ?? option.value).toLowerCase().includes(needle))
      : options;
    const selected = matched.filter(option => isChecked(option.value));
    const rest = matched.filter(option => !isChecked(option.value));
    return [...selected, ...rest];
  }, [isChecked, options, query]);

  const count = selectedCount ?? options.filter(option => isChecked(option.value)).length;
  const showSearch = options.length > searchThreshold;

  return (
    <OptionBox
      title={title}
      count={count}
      onClear={onClear}
      footer={footer}
      header={
        showSearch ? (
          <div className="relative mb-2">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400" />
            <input
              value={query}
              onChange={event => setQuery(event.target.value)}
              placeholder={searchPlaceholder}
              className="w-full rounded-lg border border-slate-300 pl-8 pr-2 py-1.5 text-xs"
            />
          </div>
        ) : null
      }
    >
      {allOption && !query.trim() ? (
        <CheckOption checked={allOption.active} onToggle={allOption.onSelect} label={allOption.label} />
      ) : null}
      {filtered.length === 0 ? (
        <p className="px-2.5 py-2 text-xs text-slate-400">{query.trim() ? 'No results.' : emptyText}</p>
      ) : (
        filtered.map(option => (
          <CheckOption
            key={option.value}
            checked={isChecked(option.value)}
            onToggle={() => onToggle(option.value)}
            label={option.label ?? option.value}
            title={option.searchText ?? option.value}
          />
        ))
      )}
    </OptionBox>
  );
};
