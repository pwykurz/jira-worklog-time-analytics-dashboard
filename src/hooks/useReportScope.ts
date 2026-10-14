import { useCallback, useEffect, useState } from 'react';
import { loadScope, ReportKind, ReportScope, saveScope } from '@/lib/reportScope';

export function useReportScope(kind: ReportKind) {
  const [scope, setScopeState] = useState<ReportScope>(() => loadScope(kind));

  useEffect(() => {
    saveScope(kind, scope);
  }, [kind, scope]);

  const setScope = useCallback((next: ReportScope) => {
    setScopeState(next);
  }, []);

  return { scope, setScope };
}
