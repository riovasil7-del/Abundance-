export const THEME_COOKIE = "theme";
export const THEME_STORAGE_KEY = "hojnost-theme";

const THEMES = ["pearl", "diamond", "garden"] as const;

export type ThemeChoice = (typeof THEMES)[number];

export function parseTheme(value: string | null | undefined): ThemeChoice | null {
  return value === "pearl" || value === "diamond" || value === "garden" ? value : null;
}

/**
 * Runs before first paint. A saved pearl, diamond, or garden choice wins.
 * The device preference only chooses Perla or Čierny diamant.
 */
export const themeBootScript = `(function(){try{var d=document.documentElement;function ok(v){return v==="pearl"||v==="diamond"||v==="garden";}if(ok(d.dataset.theme))return;var m=document.cookie.match(/(?:^|; )theme=([^;]+)/);var v=m?decodeURIComponent(m[1]):"";if(!ok(v)){try{v=localStorage.getItem("${THEME_STORAGE_KEY}")||"";}catch(e){v="";}}if(!ok(v)){v=window.matchMedia("(prefers-color-scheme: dark)").matches?"diamond":"pearl";}d.dataset.theme=v;document.addEventListener("visibilitychange",function(){document.documentElement.classList.toggle("tab-hidden",document.hidden);});}catch(e){}})();`;
