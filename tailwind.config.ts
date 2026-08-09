import type { Config } from "tailwindcss";

export default {
	darkMode: ["class"],
	content: [
		"./pages/**/*.{ts,tsx}",
		"./components/**/*.{ts,tsx}",
		"./app/**/*.{ts,tsx}",
		"./src/**/*.{ts,tsx}",
	],
	prefix: "",
	theme: {
		container: {
			center: true,
			padding: '2rem',
			screens: {
				'2xl': '1400px'
			}
		},
		extend: {
			fontFamily: {
				head: ['Oswald', 'sans-serif'],
				body: ['Rubik', 'sans-serif'],
			},
			colors: {
				steel: {
					DEFAULT: 'hsl(var(--steel))',
					dark: 'hsl(var(--steel-dark))',
				},
				rule: 'hsl(var(--rule))',
				border: 'hsl(var(--border))',
				input: 'hsl(var(--input))',
				ring: 'hsl(var(--ring))',
				background: 'hsl(var(--background))',
				foreground: 'hsl(var(--foreground))',
				primary: {
					DEFAULT: 'hsl(var(--primary))',
					foreground: 'hsl(var(--primary-foreground))'
				},
				secondary: {
					DEFAULT: 'hsl(var(--secondary))',
					foreground: 'hsl(var(--secondary-foreground))'
				},
				destructive: {
					DEFAULT: 'hsl(var(--destructive))',
					foreground: 'hsl(var(--destructive-foreground))'
				},
				muted: {
					DEFAULT: 'hsl(var(--muted))',
					foreground: 'hsl(var(--muted-foreground))'
				},
				accent: {
					DEFAULT: 'hsl(var(--accent))',
					foreground: 'hsl(var(--accent-foreground))'
				},
				popover: {
					DEFAULT: 'hsl(var(--popover))',
					foreground: 'hsl(var(--popover-foreground))'
				},
				card: {
					DEFAULT: 'hsl(var(--card))',
					foreground: 'hsl(var(--card-foreground))'
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
				}
			},
			borderRadius: {
				lg: 'var(--radius)',
				md: 'calc(var(--radius) - 2px)',
				sm: 'calc(var(--radius) - 4px)'
			},
			keyframes: {
				'accordion-down': {
					from: {
						height: '0'
					},
					to: {
						height: 'var(--radix-accordion-content-height)'
					}
				},
				'accordion-up': {
					from: {
						height: 'var(--radix-accordion-content-height)'
					},
					to: {
						height: '0'
					}
				},
				'fade-in': {
					from: { opacity: '0', transform: 'translateY(16px)' },
					to: { opacity: '1', transform: 'translateY(0)' }
				},
				'fade-in-slow': {
					from: { opacity: '0', transform: 'translateY(10px)' },
					to: { opacity: '1', transform: 'translateY(0)' }
				},
				'scale-in': {
					from: { opacity: '0', transform: 'scale(0.96)' },
					to: { opacity: '1', transform: 'scale(1)' }
				},
				'glow-pulse': {
					'0%, 100%': { boxShadow: '0 0 0 0 hsl(var(--primary) / 0.55)' },
					'50%': { boxShadow: '0 0 0 8px hsl(var(--primary) / 0)' }
				},
				'bell-ring': {
					'0%, 100%': { transform: 'rotate(0deg)' },
					'10%': { transform: 'rotate(14deg)' },
					'20%': { transform: 'rotate(-12deg)' },
					'30%': { transform: 'rotate(9deg)' },
					'40%': { transform: 'rotate(-7deg)' },
					'50%': { transform: 'rotate(4deg)' },
					'60%, 100%': { transform: 'rotate(0deg)' }
				},
				'share-glow': {
					'0%, 100%': { boxShadow: '0 0 0 0 hsl(var(--primary) / 0.45)' },
					'50%': { boxShadow: '0 0 10px 3px hsl(var(--primary) / 0.45)' }
				},
				'shimmer-sweep': {
					from: { transform: 'translateX(-100%)' },
					to: { transform: 'translateX(100%)' }
				}
			},
			animation: {
				'accordion-down': 'accordion-down 0.2s ease-out',
				'accordion-up': 'accordion-up 0.2s ease-out',
				'fade-in': 'fade-in 0.6s ease-out both',
				'fade-in-slow': 'fade-in-slow 1.6s cubic-bezier(0.22, 1, 0.36, 1) both',
				'scale-in': 'scale-in 0.4s ease-out both',
				'glow-pulse': 'glow-pulse 2s ease-in-out infinite',
				'bell-ring': 'bell-ring 2.5s ease-in-out infinite',
				'share-glow': 'share-glow 2.2s ease-in-out infinite',
				'shimmer-sweep': 'shimmer-sweep 1.6s ease-in-out infinite'
			}
		}
	},
	plugins: [require("tailwindcss-animate")],
} satisfies Config;