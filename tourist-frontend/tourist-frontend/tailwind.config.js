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
        xs: '375px',
        sm: '576px',
        md: '768px',
        lg: '992px',
        xl: '1200px',
        '2xl': '1400px',
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
      spacing: {
        sidebar: '260px',
        'sidebar-collapsed': '72px',
      },
    },
  },
  plugins: [
    // @tailwindcss/forms plugin is disabled since Bootstrap handles form styles
  ],
};
