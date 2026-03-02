/** @type {import('tailwindcss').Config} */
module.exports = {
    content: ['./src/**/*.{ts,tsx,js,jsx}'],
    theme: {
        extend: {
            colors: {
                brand: {
                    50: '#f0fdfa', 100: '#ccfbf1', 200: '#99f6e4', 300: '#5eead4',
                    400: '#2dd4bf', 500: '#14b8a6', 600: '#0d9488', 700: '#0f766e',
                    800: '#115e59', 900: '#134e4a',
                },
                surface: {
                    DEFAULT: 'rgba(30, 41, 59, 0.6)',
                    solid: '#1e293b',
                    elevated: 'rgba(30, 41, 59, 0.8)',
                    overlay: 'rgba(15, 23, 42, 0.9)',
                },
            },
            fontFamily: {
                sans: ['var(--font-noto-sans-jp)', 'Inter', '-apple-system', 'BlinkMacSystemFont', 'sans-serif'],
            },
            borderRadius: {
                '2xl': '1rem',
                '3xl': '1.5rem',
            },
            boxShadow: {
                glass: '0 8px 32px rgba(0,0,0,0.35)',
                glow: '0 0 24px rgba(16,185,129,0.12)',
                'glow-lg': '0 0 40px rgba(16,185,129,0.18)',
                'inner-glow': 'inset 0 1px 0 rgba(255,255,255,0.05)',
            },
            animation: {
                'fade-in': 'fade-in 0.3s ease-out',
                'slide-up': 'slide-up 0.4s ease-out',
                'slide-in-left': 'slide-in-left 0.3s ease-out',
                'scale-in': 'scale-in 0.2s ease-out',
                'count-up': 'count-up 0.6s ease-out',
                shimmer: 'shimmer 2s linear infinite',
                'pulse-dot': 'pulse-dot 1.5s ease-in-out infinite',
            },
            spacing: {
                18: '4.5rem',
            },
            transitionDuration: {
                DEFAULT: '200ms',
            },
        },
    },
    plugins: [],
};
