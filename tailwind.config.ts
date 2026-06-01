import type { Config } from "tailwindcss";

const config: Config = {
    darkMode: ["class"],
    content: [
    "./pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
    "*.{js,ts,jsx,tsx,mdx}"
  ],
  theme: {
  	extend: {
  		colors: {
  			background: 'hsl(var(--background))',
  			foreground: 'hsl(var(--foreground))',
  			card: {
  				DEFAULT: 'hsl(var(--card))',
  				foreground: 'hsl(var(--card-foreground))'
  			},
  			popover: {
  				DEFAULT: 'hsl(var(--popover))',
  				foreground: 'hsl(var(--popover-foreground))'
  			},
  			primary: {
  				DEFAULT: 'hsl(var(--primary))',
  				foreground: 'hsl(var(--primary-foreground))'
  			},
  			secondary: {
  				DEFAULT: 'hsl(var(--secondary))',
  				foreground: 'hsl(var(--secondary-foreground))'
  			},
  			muted: {
  				DEFAULT: 'hsl(var(--muted))',
  				foreground: 'hsl(var(--muted-foreground))'
  			},
  			accent: {
  				DEFAULT: 'hsl(var(--accent))',
  				foreground: 'hsl(var(--accent-foreground))'
  			},
  			destructive: {
  				DEFAULT: 'hsl(var(--destructive))',
  				foreground: 'hsl(var(--destructive-foreground))'
  			},
  			border: 'hsl(var(--border))',
  			input: 'hsl(var(--input))',
  			ring: 'hsl(var(--ring))',
  			chart: {
  				'1': 'hsl(var(--chart-1))',
  				'2': 'hsl(var(--chart-2))',
  				'3': 'hsl(var(--chart-3))',
  				'4': 'hsl(var(--chart-4))',
  				'5': 'hsl(var(--chart-5))'
  			},
  			sidebar: {
  				DEFAULT: 'hsl(var(--sidebar-background))',
  				foreground: 'hsl(var(--sidebar-foreground))',
  				primary: 'hsl(var(--sidebar-primary))',
  				'primary-foreground': 'hsl(var(--sidebar-primary-foreground))',
  				accent: 'hsl(var(--sidebar-accent))',
  				'accent-foreground': 'hsl(var(--sidebar-accent-foreground))',
  				border: 'hsl(var(--sidebar-border))',
  				ring: 'hsl(var(--sidebar-ring))'
  			},
  			// Brand green palette — OEM identity
  			brand: {
  				50:  '#f0fdf4',
  				100: '#dcfce7',
  				200: '#bbf7d0',
  				300: '#86efac',
  				400: '#4ade80',
  				500: '#22c55e',
  				600: '#16a34a',
  				700: '#15803d',
  				800: '#166534',
  				900: '#14532d',
  				950: '#052e16',
  			},
  			// Cinematic dark palette — premium sections
  			cinema: {
  				50:  '#f5f5f5',
  				100: '#e0e0e0',
  				200: '#bdbdbd',
  				300: '#9e9e9e',
  				400: '#757575',
  				500: '#424242',
  				600: '#2a2a2a',
  				700: '#1a1a1a',
  				800: '#111111',
  				900: '#0a0a0a',
  				950: '#050505',
  			},
  		},
  		borderRadius: {
  			lg: 'var(--radius)',
  			md: 'calc(var(--radius) - 2px)',
  			sm: 'calc(var(--radius) - 4px)'
  		},
  		fontSize: {
  			// Display type scale for cinematic headings
  			'display-xs': ['2rem',    { lineHeight: '1.15', letterSpacing: '-0.02em', fontWeight: '700' }],
  			'display-sm': ['2.75rem', { lineHeight: '1.1',  letterSpacing: '-0.025em', fontWeight: '700' }],
  			'display-md': ['3.75rem', { lineHeight: '1.05', letterSpacing: '-0.03em', fontWeight: '700' }],
  			'display-lg': ['5rem',    { lineHeight: '1.0',  letterSpacing: '-0.035em', fontWeight: '800' }],
  			'display-xl': ['6.5rem',  { lineHeight: '0.95', letterSpacing: '-0.04em', fontWeight: '800' }],
  			'display-2xl':['8.5rem',  { lineHeight: '0.9',  letterSpacing: '-0.045em', fontWeight: '900' }],
  		},
  		keyframes: {
  			'accordion-down': {
  				from: { height: '0' },
  				to: { height: 'var(--radix-accordion-content-height)' }
  			},
  			'accordion-up': {
  				from: { height: 'var(--radix-accordion-content-height)' },
  				to: { height: '0' }
  			},
  			// Scroll-reveal animations
  			'fade-up': {
  				'0%':   { opacity: '0', transform: 'translateY(32px)' },
  				'100%': { opacity: '1', transform: 'translateY(0)' },
  			},
  			'fade-down': {
  				'0%':   { opacity: '0', transform: 'translateY(-32px)' },
  				'100%': { opacity: '1', transform: 'translateY(0)' },
  			},
  			'fade-left': {
  				'0%':   { opacity: '0', transform: 'translateX(40px)' },
  				'100%': { opacity: '1', transform: 'translateX(0)' },
  			},
  			'fade-right': {
  				'0%':   { opacity: '0', transform: 'translateX(-40px)' },
  				'100%': { opacity: '1', transform: 'translateX(0)' },
  			},
  			'fade-in': {
  				'0%':   { opacity: '0' },
  				'100%': { opacity: '1' },
  			},
  			'scale-in': {
  				'0%':   { opacity: '0', transform: 'scale(0.94)' },
  				'100%': { opacity: '1', transform: 'scale(1)' },
  			},
  			// Ken Burns for hero images
  			'ken-burns': {
  				'0%':   { transform: 'scale(1)' },
  				'100%': { transform: 'scale(1.06)' },
  			},
  			// Subtle float for product imagery
  			'float': {
  				'0%, 100%': { transform: 'translateY(0px)' },
  				'50%':       { transform: 'translateY(-12px)' },
  			},
  			// Marquee scroll for logos
  			'logo-marquee': {
  				'0%':   { transform: 'translateX(0)' },
  				'100%': { transform: 'translateX(-50%)' },
  			},
  			// Shimmer for skeleton loaders
  			'shimmer': {
  				'0%':   { backgroundPosition: '-200% 0' },
  				'100%': { backgroundPosition: '200% 0' },
  			},
  			// Count-up animation trigger (JS-driven, CSS marks start)
  			'count-up': {
  				'0%':   { opacity: '0', transform: 'translateY(20px)' },
  				'100%': { opacity: '1', transform: 'translateY(0)' },
  			},
  		},
  		animation: {
  			'accordion-down':  'accordion-down 0.2s ease-out',
  			'accordion-up':    'accordion-up 0.2s ease-out',
  			'fade-up':         'fade-up 0.7s cubic-bezier(0.16,1,0.3,1) forwards',
  			'fade-down':       'fade-down 0.7s cubic-bezier(0.16,1,0.3,1) forwards',
  			'fade-left':       'fade-left 0.7s cubic-bezier(0.16,1,0.3,1) forwards',
  			'fade-right':      'fade-right 0.7s cubic-bezier(0.16,1,0.3,1) forwards',
  			'fade-in':         'fade-in 0.6s ease-out forwards',
  			'scale-in':        'scale-in 0.6s cubic-bezier(0.16,1,0.3,1) forwards',
  			'ken-burns':       'ken-burns 20s ease-in-out infinite alternate',
  			'float':           'float 6s ease-in-out infinite',
  			'logo-marquee':    'logo-marquee 36s linear infinite',
  			'shimmer':         'shimmer 2s linear infinite',
  			'count-up':        'count-up 0.6s cubic-bezier(0.16,1,0.3,1) forwards',
  		},
  		transitionTimingFunction: {
  			'spring': 'cubic-bezier(0.16, 1, 0.3, 1)',
  			'premium': 'cubic-bezier(0.4, 0, 0.2, 1)',
  		},
  		backgroundImage: {
  			'cinema-radial': 'radial-gradient(ellipse at center, #1a1a1a 0%, #0a0a0a 100%)',
  			'cinema-top':    'linear-gradient(to bottom, #111111 0%, #0a0a0a 100%)',
  			'hero-overlay':  'linear-gradient(to right, rgba(0,0,0,0.75) 0%, rgba(0,0,0,0.35) 50%, rgba(0,0,0,0) 100%)',
  			'brand-gradient':'linear-gradient(135deg, #16a34a 0%, #15803d 100%)',
  			'brand-subtle':  'linear-gradient(135deg, #f0fdf4 0%, #dcfce7 100%)',
  		},
  	}
  },
  plugins: [require("tailwindcss-animate")],
};
export default config;
