import tseslint from 'typescript-eslint';

// Module boundaries per tech-spec §3: core/ imports nothing from other layers
// (and never touches three.js or the DOM). Enforced here so purity can't erode.
export default tseslint.config(
  ...tseslint.configs.recommended,
  {
    files: ['src/core/**/*.ts'],
    rules: {
      'no-restricted-imports': [
        'error',
        {
          patterns: [
            { group: ['three', 'three/*'], message: 'core/ is a pure simulation — no rendering imports (tech-spec §3).' },
            { group: ['../render/*', '../input/*', '../audio/*', '../platform/*', '**/render/*', '**/input/*', '**/audio/*', '**/platform/*'], message: 'core/ imports nothing from other layers (tech-spec §3).' },
          ],
        },
      ],
      'no-restricted-globals': [
        'error',
        { name: 'window', message: 'core/ runs headless (tech-spec §3).' },
        { name: 'document', message: 'core/ runs headless (tech-spec §3).' },
        { name: 'requestAnimationFrame', message: 'core/ has no frame clock — fixed ticks only (tech-spec §3).' },
      ],
    },
  },
  {
    files: ['src/core/**/*.ts'],
    ignores: ['src/core/**/*.test.ts'],
    rules: {
      'no-restricted-properties': [
        'error',
        { object: 'Date', property: 'now', message: 'No wall clock in core — determinism rule (tech-spec §3).' },
        { object: 'Math', property: 'random', message: 'Use the seeded RNG — determinism rule (tech-spec §3).' },
      ],
    },
  },
);
