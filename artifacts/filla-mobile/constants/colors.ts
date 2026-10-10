/**
 * Semantic design tokens for the mobile app.
 *
 * These tokens mirror the naming conventions used in web artifacts (index.css)
 * so that multi-artifact projects share a cohesive visual identity.
 *
 * Replace the placeholder values below with values that match the project's
 * brand. If a sibling web artifact exists, read its index.css and convert the
 * HSL values to hex so both artifacts use the same palette.
 *
 * To add dark mode, add a `dark` key with the same token names.
 * The useColors() hook will automatically pick it up.
 */

const colors = {
  light: {
    text: '#243d34',
    tint: '#79bb62',
    background: '#f7faf2',
    foreground: '#243d34',
    card: '#ffffff',
    cardForeground: '#243d34',
    primary: '#79bb62',
    primaryForeground: '#ffffff',
    secondary: '#eaf4e3',
    secondaryForeground: '#365a45',
    muted: '#f1f6eb',
    mutedForeground: '#7b8b7e',
    accent: '#f8d881',
    accentForeground: '#493b1a',
    destructive: '#bd6653',
    destructiveForeground: '#ffffff',
    border: '#dce6d5',
    input: '#dce6d5',
  },
  dark: {
    text: '#e9f0df',
    tint: '#8ccc72',
    background: '#18251f',
    foreground: '#e9f0df',
    card: '#202d27',
    cardForeground: '#e9f0df',
    primary: '#8ccc72',
    primaryForeground: '#18251f',
    secondary: '#2c3d34',
    secondaryForeground: '#e9f0df',
    muted: '#293831',
    mutedForeground: '#a9b4a9',
    accent: '#e6c36a',
    accentForeground: '#302916',
    destructive: '#d47a67',
    destructiveForeground: '#ffffff',
    border: '#3a4b41',
    input: '#3a4b41',
  },
  radius: 19,
};

export default colors;
