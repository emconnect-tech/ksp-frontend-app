import React, { createContext, useContext } from 'react';
import type { OrgTheme } from '../config/orgThemes';
import { getOrgTheme, applyTheme } from '../config/orgThemes';

interface OrgContextType {
  theme: OrgTheme;
}

const OrgContext = createContext<OrgContextType>({ theme: getOrgTheme() });

const _theme = getOrgTheme();
applyTheme(_theme);
if (_theme.displayName) document.title = _theme.displayName;

export const OrgProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  return (
    <OrgContext.Provider value={{ theme: _theme }}>
      {children}
    </OrgContext.Provider>
  );
};

export const useOrg = () => useContext(OrgContext);
