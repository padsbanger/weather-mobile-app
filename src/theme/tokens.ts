export const lightColors = {
  background: '#F5F7FA', surface: '#FFFFFF', text: '#172438', muted: '#526175',
  accent: '#1267D5', onAccent: '#FFFFFF', border: '#DEE5ED', warning: '#854D0E', warningSurface: '#FFF3D6',
  water: '#AAD3DF', shadow: '#172438', scrim: '#17243855',
  severity1: '#854D0E', severity1Surface: '#FFF3D6',
  severity2: '#9A3412', severity2Surface: '#FFEDD5',
  severity3: '#991B1B', severity3Surface: '#FEE2E2',
} as const;
export const darkColors: ThemeColors = {
  background: '#0D1724', surface: '#17283A', text: '#EDF4FC', muted: '#B7C7DA',
  accent: '#77B7FF', onAccent: '#091B30', border: '#3B5268', warning: '#FFD383', warningSurface: '#493821',
  water: '#162736', shadow: '#000000', scrim: '#050C13B3',
  severity1: '#FFD383', severity1Surface: '#493821',
  severity2: '#FFAC79', severity2Surface: '#4B2F27',
  severity3: '#FF9A9A', severity3Surface: '#4D2730',
};
export type ThemeColors = { [Key in keyof typeof lightColors]: string };
export const theme = {
  color: lightColors,
  space: { small: 8, medium: 16, large: 24 },
  radius: { control: 16, panel: 24 },
} as const;
