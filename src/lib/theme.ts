export const THEME_COOKIE = "theme";
export const THEME_STORAGE_KEY = "hojnost-theme";

export type ThemeChoice = "pearl" | "diamond";

export function parseTheme(value: string | null | undefined): ThemeChoice | null {
  return value === "pearl" || value === "diamond" ? value : null;
}

/** Runs before first paint. A saved choice wins; otherwise the device preference. */
export const themeBootScript = `(function(){try{var d=document.documentElement;if(d.dataset.theme==="pearl"||d.dataset.theme==="diamond")return;var m=document.cookie.match(/(?:^|; )theme=([^;]+)/);var v=m?decodeURIComponent(m[1]):"";if(v!=="pearl"&&v!=="diamond"){try{v=localStorage.getItem("${THEME_STORAGE_KEY}")||"";}catch(e){v="";}}if(v!=="pearl"&&v!=="diamond"){v=window.matchMedia("(prefers-color-scheme: dark)").matches?"diamond":"pearl";}d.dataset.theme=v;}catch(e){}})();`;
