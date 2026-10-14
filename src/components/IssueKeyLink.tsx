import React from 'react';
import { ExternalLink } from 'lucide-react';
import { useJiraSiteUrl } from '@/components/JiraSiteContext';
import { issueBrowseUrl } from '@/lib/jiraLinks';

interface IssueKeyLinkProps {
  issueKey: string;
  className?: string;
  showIcon?: boolean;
}

export const IssueKeyLink: React.FC<IssueKeyLinkProps> = ({
  issueKey,
  className = '',
  showIcon = true
}) => {
  const siteUrl = useJiraSiteUrl();
  const href = issueBrowseUrl(siteUrl, issueKey);

  if (!href) {
    return <span className={className}>{issueKey}</span>;
  }

  return (
    <a
      href={href}
      target="_blank"
      rel="noreferrer noopener"
      title={`Open ${issueKey} in Jira`}
      onClick={event => event.stopPropagation()}
      className={`inline-flex items-center gap-1 hover:underline ${className}`}
    >
      {issueKey}
      {showIcon ? <ExternalLink className="w-3 h-3 opacity-60" /> : null}
    </a>
  );
};
