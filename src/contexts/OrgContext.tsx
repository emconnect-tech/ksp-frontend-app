import React, { createContext, useContext, useEffect } from 'react';
import type { OrgTheme } from '../config/orgThemes';
import { getOrgTheme, applyTheme } from '../config/orgThemes';

interface OrgContextType {
  theme: OrgTheme;
}

const OrgContext = createContext<OrgContextType>({ theme: getOrgTheme() });

export const OrgProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const theme = getOrgTheme();

  useEffect(() => {
    applyTheme(theme);
    if (theme.displayName) document.title = theme.displayName;
  }, []);

  return (
    <OrgContext.Provider value={{ theme }}>
      {children}
    </OrgContext.Provider>
  );
};

export const useOrg = () => useContext(OrgContext);
