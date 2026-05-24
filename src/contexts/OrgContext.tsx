import React, { createContext, useContext, useState, useEffect } from 'react';
import { useAuth } from './AuthContext';

interface OrgPreferences {
  displayName: string | null;
  primaryColor: string | null;
  secondaryColor: string | null;
}

interface OrgContextType {
  preferences: OrgPreferences;
  updatePreferences: (patch: Partial<OrgPreferences>) => Promise<void>;
}

const defaultPreferences: OrgPreferences = {
  displayName: null,
  primaryColor: null,
  secondaryColor: null,
};

const OrgContext = createContext<OrgContextType>({
  preferences: defaultPreferences,
  updatePreferences: async () => {},
});

function applyTheme(prefs: OrgPreferences) {
  const root = document.documentElement;
  if (prefs.primaryColor) {
    root.style.setProperty('--color-primary', prefs.primaryColor);
    root.style.setProperty('--color-primary-hover', darken(prefs.primaryColor, 15));
    root.style.setProperty('--color-primary-light', lighten(prefs.primaryColor, 90));
  }
  if (prefs.secondaryColor) {
    root.style.setProperty('--color-accent', prefs.secondaryColor);
  }
}

function hexToRgb(hex: string) {
  const r = parseInt(hex.slice(1, 3), 16);
  const g = parseInt(hex.slice(3, 5), 16);
  const b = parseInt(hex.slice(5, 7), 16);
  return { r, g, b };
}

function rgbToHex(r: number, g: number, b: number) {
  return '#' + [r, g, b].map(v => Math.max(0, Math.min(255, Math.round(v))).toString(16).padStart(2, '0')).join('');
}

function darken(hex: string, amount: number) {
  const { r, g, b } = hexToRgb(hex);
  return rgbToHex(r - amount, g - amount, b - amount);
}

function lighten(hex: string, percent: number) {
  const { r, g, b } = hexToRgb(hex);
  const mix = (c: number) => c + (255 - c) * (percent / 100);
  return rgbToHex(mix(r), mix(g), mix(b));
}

export const OrgProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [preferences, setPreferences] = useState<OrgPreferences>(defaultPreferences);
  const { token, isAuthenticated } = useAuth();
  const API_BASE_URL = import.meta.env.VITE_API_URL || '';

  useEffect(() => {
    if (!isAuthenticated || !token) return;
    fetch(`${API_BASE_URL}/api/v1/org/preferences`, {
      headers: { 'Authorization': `Bearer ${token}` },
    })
      .then(r => r.ok ? r.json() : null)
      .then(data => {
        if (data) {
          setPreferences(data);
          applyTheme(data);
        }
      })
      .catch(() => {});
  }, [isAuthenticated, token]);

  const updatePreferences = async (patch: Partial<OrgPreferences>) => {
    const res = await fetch(`${API_BASE_URL}/api/v1/org/preferences`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
      body: JSON.stringify(patch),
    });
    if (res.ok) {
      const updated = await res.json();
      setPreferences(updated);
      applyTheme(updated);
    }
  };

  return (
    <OrgContext.Provider value={{ preferences, updatePreferences }}>
      {children}
    </OrgContext.Provider>
  );
};

export const useOrg = () => useContext(OrgContext);
