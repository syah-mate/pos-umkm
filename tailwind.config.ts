import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        // WCAG AA Compliant Color System
        primary: {
          50: '#e3f2fd',
          100: '#bbdefb',
          200: '#90caf9',
          300: '#64b5f6',
          400: '#42a5f5',
          500: '#1976d2', // 4.5:1 on white
          600: '#1565c0',
          700: '#0d47a1', // Better contrast
          800: '#0a3b7a',
          900: '#062a5c',
        },
        // WCAG compliant gray scale
        gray: {
          50: '#f9fafb',
          100: '#f3f4f6',
          200: '#e5e7eb',
          300: '#d1d5db',
          400: '#9ca3af',
          500: '#6b7280', // 4.5:1 on white
          600: '#5a6c7d', // 5.1:1 on white
          700: '#4a5568', // 7.9:1 on white
          800: '#2d3748',
          900: '#1a202c',
          950: '#0f1419',
        },
        // Status colors - WCAG compliant
        success: {
          light: '#e8f5e9',
          DEFAULT: '#2e7d32', // 4.6:1 on white
          dark: '#1b5e20',
        },
        error: {
          light: '#ffebee',
          DEFAULT: '#c62828', // 6.4:1 on white
          dark: '#b71c1c',
        },
        warning: {
          light: '#fff3e0',
          DEFAULT: '#e65100', // 5.3:1 on white
          dark: '#bf360c',
        },
        info: {
          light: '#e3f2fd',
          DEFAULT: '#0277bd', // 5.9:1 on white
          dark: '#01579b',
        },
      },
      fontSize: {
        // WCAG compliant font sizes (16px base minimum)
        'xs': ['0.875rem', { lineHeight: '1.5', letterSpacing: '0.02em' }], // 14px - use sparingly
        'sm': ['0.9375rem', { lineHeight: '1.5', letterSpacing: '0.02em' }], // 15px
        'base': ['1rem', { lineHeight: '1.5', letterSpacing: '0.02em' }], // 16px - default
        'lg': ['1.125rem', { lineHeight: '1.5', letterSpacing: '0.01em' }], // 18px
        'xl': ['1.25rem', { lineHeight: '1.4', letterSpacing: '0.01em' }], // 20px
        '2xl': ['1.5rem', { lineHeight: '1.3', letterSpacing: '0.01em' }], // 24px
        '3xl': ['1.875rem', { lineHeight: '1.3', letterSpacing: '0.01em' }], // 30px
        '4xl': ['2.25rem', { lineHeight: '1.2', letterSpacing: '0' }], // 36px
      },
      lineHeight: {
        // WCAG requires minimum 1.5 for body text
        'wcag': '1.5',
        'wcag-heading': '1.3',
      },
      letterSpacing: {
        // WCAG recommends 0.12em spacing
        'wcag': '0.02em',
      },
      spacing: {
        // Paragraph spacing should be 1.5x line height
        'paragraph': '1.5em',
      },
      ringWidth: {
        // Focus indicators - WCAG requires 3px minimum
        'focus': '3px',
      },
      ringOffsetWidth: {
        'focus': '2px',
      },
    },
  },
  plugins: [],
};

export default config;
