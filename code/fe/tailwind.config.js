const colorNames = [
  'canvas',
  'surface',
  'surfaceSubtle',
  'text',
  'secondary',
  'divider',
  'control',
  'brand',
  'brandSubtle',
  'onBrand',
  'positive',
  'negative',
  'warning',
  'warningSubtle',
  'negativeSubtle',
];

module.exports = {
  content: ['./src/**/*.{ts,tsx}'],
  presets: [require('nativewind/preset')],
  theme: {
    extend: {
      colors: Object.fromEntries(colorNames.map((name) => [name, `var(--color-${name})`])),
    },
  },
};
