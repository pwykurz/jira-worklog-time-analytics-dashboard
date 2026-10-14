export function issueBrowseUrl(siteUrl: string | null | undefined, issueKey: string): string {
  if (!siteUrl || !issueKey) {
    return '';
  }
  return `${siteUrl.replace(/\/+$/, '')}/browse/${encodeURIComponent(issueKey)}`;
}
