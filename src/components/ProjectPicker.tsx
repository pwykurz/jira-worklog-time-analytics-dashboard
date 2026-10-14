import React from 'react';
import { JiraProject } from '@/api/projects';

interface ProjectPickerProps {
  projects: JiraProject[];
  value: string;
  disabled?: boolean;
  onChange: (projectKey: string) => void;
}

export const ProjectPicker: React.FC<ProjectPickerProps> = ({ projects, value, disabled, onChange }) => {
  return (
    <label className="flex items-center gap-2 text-xs text-slate-600">
      <span className="font-semibold shrink-0">Project</span>
      <select
        value={value}
        disabled={disabled}
        onChange={e => onChange(e.target.value)}
        className="px-2.5 py-1.5 border border-slate-200 rounded-lg text-sm bg-white min-w-[180px] disabled:opacity-50"
      >
        <option value="">All</option>
        {projects.map(project => (
          <option key={project.id} value={project.key}>
            {project.key} — {project.name}
          </option>
        ))}
      </select>
    </label>
  );
};
