export interface OrgTheme {
  displayName: string;
  primaryColor: string;
  secondaryColor: string;
}

const themes: Record<string, OrgTheme> = {
  mohinifab: {
    displayName: 'Mohinifab',
    primaryColor: '#E8197D',
    secondaryColor: '#29B6E8',
  },
};

const defaultTheme: OrgTheme = {
  displayName: '',
  primaryColor: '#FF4C00',
  secondaryColor: '#3A4AD9',
};

export function getSubdomain(): string | null {
  const parts = window.location.hostname.split('.');
  const sub = parts.length > 1 && parts[0] !== 'www' ? parts[0] : null;
  // fallback for local dev: check ?org= query param
  if (!sub) {
    const param = new URLSearchParams(window.location.search).get('org');
    return param || null;
  }
  return sub;
}

export function getOrgTheme(): OrgTheme {
  const sub = getSubdomain();
  return (sub && themes[sub]) ? themes[sub] : defaultTheme;
}

export function applyTheme(theme: OrgTheme) {
  const root = document.documentElement;
  if (!theme.primaryColor) return;
  root.style.setProperty('--color-primary', theme.primaryColor);
  root.style.setProperty('--color-primary-hover', darken(theme.primaryColor, 15));
  root.style.setProperty('--color-primary-light', lighten(theme.primaryColor, 90));
  if (theme.secondaryColor) root.style.setProperty('--color-accent', theme.secondaryColor);
}

function hexToRgb(hex: string) {
  return { r: parseInt(hex.slice(1,3),16), g: parseInt(hex.slice(3,5),16), b: parseInt(hex.slice(5,7),16) };
}
function rgbToHex(r: number, g: number, b: number) {
  return '#' + [r,g,b].map(v => Math.max(0,Math.min(255,Math.round(v))).toString(16).padStart(2,'0')).join('');
}
function darken(hex: string, amt: number) {
  const {r,g,b} = hexToRgb(hex); return rgbToHex(r-amt, g-amt, b-amt);
}
function lighten(hex: string, pct: number) {
  const {r,g,b} = hexToRgb(hex); return rgbToHex(r+(255-r)*pct/100, g+(255-g)*pct/100, b+(255-b)*pct/100);
}
