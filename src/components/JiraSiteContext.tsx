import React, { createContext, useContext } from 'react';

const JiraSiteUrlContext = createContext<string>('');

export const JiraSiteUrlProvider: React.FC<{ value: string; children: React.ReactNode }> = ({
  value,
  children
}) => <JiraSiteUrlContext.Provider value={value}>{children}</JiraSiteUrlContext.Provider>;

export function useJiraSiteUrl(): string {
  return useContext(JiraSiteUrlContext);
}
