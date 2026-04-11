/** @type {import('tailwindcss').Config} */
export default {
  content: [
    './index.html',
    './src/**/*.{js,ts,jsx,tsx}',
  ],
  // All Tailwind utilities get a tw- prefix to avoid conflicts with Bootstrap and existing CSS
  prefix: 'tw-',
  // Disable Tailwind's base reset - Bootstrap Reboot owns the base styles
  corePlugins: {
    preflight: false,
  },
  theme: {
    extend: {
      colors: {
        brand: {
          blue: '#3095EC',
          'blue-soft': '#dfeefe',
          'blue-dark': '#2E7FF0',
          bg: '#ECEFF7',
          card: '#e8edf7',
          ink: '#1E1E1E',
          muted: '#606977',
          line: '#cad2e0',
          danger: '#ef4a42',
        },
      },
      fontFamily: {
        karla: ['Karla', 'sans-serif'],
        inter: ['Inter', 'sans-serif'],
      },
      screens: {
        sm: '430px',
        md: '768px',
        lg: '992px',
        xl: '1400px',
      },
      fontSize: {
        xs: ['11px', { lineHeight: '1.4', fontWeight: '600' }],
        sm: ['13px', { lineHeight: '1.45', fontWeight: '600' }],
        base: ['16px', { lineHeight: '1.5', fontWeight: '400' }],
        lg: ['18px', { lineHeight: '1.6', fontWeight: '600' }],
        xl: ['20px', { lineHeight: '1.65', fontWeight: '600' }],
        '2xl': ['24px', { lineHeight: '1.2', fontWeight: '700' }],
        '3xl': ['28px', { lineHeight: '1.1', fontWeight: '700' }],
        '4xl': ['36px', { lineHeight: '1.0', fontWeight: '800' }],
      },
      spacing: {
        '1': 'var(--space-1)',
        '2': 'var(--space-2)',
        '3': 'var(--space-3)',
        '4': 'var(--space-4)',
        '5': 'var(--space-5)',
        '6': 'var(--space-6)',
        '7': 'var(--space-7)',
        '8': 'var(--space-8)',
        sidebar: '260px',
        'sidebar-collapsed': '72px',
      },
      borderRadius: {
        pill: '999px',
        xl: '20px',
        lg: '16px',
        md: '12px',
      },
      boxShadow: {
        soft: '0 16px 36px rgba(35, 61, 107, 0.12)',
        card: '0 4px 16px rgba(35, 61, 107, 0.08)',
        sidebar: '4px 0 24px rgba(35, 61, 107, 0.08)',
      },
      transitionDuration: {
        250: '250ms',
      },
      maxWidth: {
        'screen-content': '1400px',
      },
    },
  },
  plugins: [
    // @tailwindcss/forms plugin is disabled since Bootstrap handles form styles
  ],
};
