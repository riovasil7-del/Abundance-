import localFont from "next/font/local";

export const interLatin = localFont({
  src: "../fonts/inter-latin-w100900.woff2",
  weight: "100 900",
  style: "normal",
  display: "swap",
  preload: true,
  variable: "--font-inter-latin",
  adjustFontFallback: "Arial",
  declarations: [{ prop: "unicode-range", value: "U+0000-00FF, U+0131, U+0152-0153, U+02BB-02BC, U+02C6, U+02DA, U+02DC, U+0304, U+0308, U+0329, U+2000-206F, U+20AC, U+2122, U+2191, U+2193, U+2212, U+2215, U+FEFF, U+FFFD" }],
});

export const interExt = localFont({
  src: "../fonts/inter-latin-ext-w100900.woff2",
  weight: "100 900",
  style: "normal",
  display: "swap",
  preload: true,
  variable: "--font-inter-ext",
  adjustFontFallback: false,
  declarations: [{ prop: "unicode-range", value: "U+0100-02BA, U+02BD-02C5, U+02C7-02CC, U+02CE-02D7, U+02DD-02FF, U+0304, U+0308, U+0329, U+1D00-1DBF, U+1E00-1E9F, U+1EF2-1EFF, U+2020, U+20A0-20AB, U+20AD-20C4, U+2113, U+2C60-2C7F, U+A720-A7FF" }],
});

export const interVi = localFont({
  src: "../fonts/inter-vietnamese-w100900.woff2",
  weight: "100 900",
  style: "normal",
  display: "swap",
  preload: false,
  variable: "--font-inter-vi",
  adjustFontFallback: false,
  declarations: [{ prop: "unicode-range", value: "U+0102-0103, U+0110-0111, U+0128-0129, U+0168-0169, U+01A0-01A1, U+01AF-01B0, U+0300-0301, U+0303-0304, U+0308-0309, U+0323, U+0329, U+1EA0-1EF9, U+20AB" }],
});

export const cormorantLatin = localFont({
  src: "../fonts/cormorant-latin-w600.woff2",
  weight: "600 700",
  style: "normal",
  display: "swap",
  preload: true,
  variable: "--font-cormorant-latin",
  adjustFontFallback: "Times New Roman",
  declarations: [{ prop: "unicode-range", value: "U+0000-00FF, U+0131, U+0152-0153, U+02BB-02BC, U+02C6, U+02DA, U+02DC, U+0304, U+0308, U+0329, U+2000-206F, U+20AC, U+2122, U+2191, U+2193, U+2212, U+2215, U+FEFF, U+FFFD" }],
});

export const cormorantExt = localFont({
  src: "../fonts/cormorant-latin-ext-w600.woff2",
  weight: "600 700",
  style: "normal",
  display: "swap",
  preload: true,
  variable: "--font-cormorant-ext",
  adjustFontFallback: false,
  declarations: [{ prop: "unicode-range", value: "U+0100-02BA, U+02BD-02C5, U+02C7-02CC, U+02CE-02D7, U+02DD-02FF, U+0304, U+0308, U+0329, U+1D00-1DBF, U+1E00-1E9F, U+1EF2-1EFF, U+2020, U+20A0-20AB, U+20AD-20C4, U+2113, U+2C60-2C7F, U+A720-A7FF" }],
});

export const cormorantVi = localFont({
  src: "../fonts/cormorant-vietnamese-w600.woff2",
  weight: "600 700",
  style: "normal",
  display: "swap",
  preload: false,
  variable: "--font-cormorant-vi",
  adjustFontFallback: false,
  declarations: [{ prop: "unicode-range", value: "U+0102-0103, U+0110-0111, U+0128-0129, U+0168-0169, U+01A0-01A1, U+01AF-01B0, U+0300-0301, U+0303-0304, U+0308-0309, U+0323, U+0329, U+1EA0-1EF9, U+20AB" }],
});

export const arabic = localFont({
  src: "../fonts/arabic-arabic-w400.woff2",
  weight: "400 600",
  style: "normal",
  display: "swap",
  preload: false,
  variable: "--font-arabic",
  adjustFontFallback: false,
  declarations: [{ prop: "unicode-range", value: "U+0600-06FF, U+0750-077F, U+0870-0891, U+0897-08E1, U+08E3-08FF, U+200C-200E, U+2010-2011, U+204F, U+2E41, U+FB50-FDFF, U+FE70-FE74, U+FE76-FEFC" }],
});

export const ethiopic = localFont({
  src: "../fonts/ethiopic-ethiopic-w400.woff2",
  weight: "400 600",
  style: "normal",
  display: "swap",
  preload: false,
  variable: "--font-ethiopic",
  adjustFontFallback: false,
  declarations: [{ prop: "unicode-range", value: "U+030E, U+1200-1399, U+2D80-2DDE, U+AB01-AB2E, U+1E7E0-1E7E6, U+1E7E8-1E7EB, U+1E7ED-1E7EE, U+1E7F0-1E7FE" }],
});

export const ethiopicSerif = localFont({
  src: "../fonts/ethiopic-serif-ethiopic-w600.woff2",
  weight: "600",
  style: "normal",
  display: "swap",
  preload: false,
  variable: "--font-ethiopic-serif",
  adjustFontFallback: false,
  declarations: [{ prop: "unicode-range", value: "U+030E, U+1200-1399, U+2D80-2DDE, U+AB01-AB2E, U+1E7E0-1E7E6, U+1E7E8-1E7EB, U+1E7ED-1E7EE, U+1E7F0-1E7FE" }],
});
