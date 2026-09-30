const expoConfig = require('eslint-config-expo/flat');

module.exports = [
  ...expoConfig,
  {
    ignores: [
      'node_modules/**',
      '.expo/**',
      'dist/**',
      'BitChord/**',
      'BITCHORD_RE/**',
      'docs/**',
      '.agents/**',
    ],
  },
  {
    rules: {
      'react-hooks/immutability': 'off',
    },
  },
];
