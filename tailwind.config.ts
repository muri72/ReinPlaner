import type { Config } from "tailwindcss";

export default {
    darkMode: ["class"],
    content: [
    "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
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
            success: {
              DEFAULT: 'hsl(var(--success))',
              foreground: 'hsl(var(--success-foreground))'
            },
            warning: {
              DEFAULT: 'hsl(var(--warning))',
              foreground: 'hsl(var(--warning-foreground))'
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
  		},
        /* Typographic Scale (1.25 ratio) */
        fontSize: {
          xs: ['0.75rem', { lineHeight: '1.5' }],   // 12px
          sm: ['0.9375rem', { lineHeight: '1.5' }], // 15px
          base: ['1.125rem', { lineHeight: '1.5' }], // 18px
          lg: ['1.5rem', { lineHeight: '1.2' }],    // 24px
          xl: ['1.875rem', { lineHeight: '1.2' }],   // 30px
          '2xl': ['2.3125rem', { lineHeight: '1.2' }], // 37px
          '3xl': ['2.875rem', { lineHeight: '1.2' }],  // 46px
        },
        /* Line Heights */
        lineHeight: {
          'tight': '1.2',
          'normal': '1.5',
          'snug': '1.4',
        },
        /* Letter Spacing */
        letterSpacing: {
          tight: '-0.02em',
          normal: '0',
          wide: '0.05em', // For small caps
        },
        /* Spacing System (already aligned with 4px/8px base) */
        spacing: {
          '1': '4px',
          '2': '8px',
          '3': '12px',
          '4': '16px',
          '5': '20px', // Added for icon size
          '6': '24px',
          '8': '32px',
          '12': '48px',
          '16': '64px',
        },
  		borderRadius: {
  			lg: 'var(--radius)',
  			md: 'var(--radius-md)',
  			sm: 'var(--radius-sm)',
            xl: 'var(--radius-xl)',
            '2xl': 'var(--radius-2xl)',
  		},
        boxShadow: {
          // Neumorphic soft shadows (adjusted for dark mode compatibility)
          'neumorphic': '6px 6px 12px rgba(0, 0, 0, 0.3), -6px -6px 12px rgba(255, 255, 255, 0.05)',
          'elevation-1': '0px 1px 2px rgba(0, 0, 0, 0.03), 0px 1px 1px rgba(0, 0, 0, 0.02)',
          'elevation-2': '0px 2px 4px rgba(0, 0, 0, 0.04), 0px 2px 2px rgba(0, 0, 0, 0.03)',
          'elevation-3': '0px 4px 8px rgba(0, 0, 0, 0.05), 0px 4px 4px rgba(0, 0, 0, 0.04)',
          'elevation-4': '0px 8px 16px rgba(0, 0, 0, 0.06), 0px 8px 8px rgba(0, 0, 0, 0.05)',
          'elevation-5': '0px 16px 32px rgba(0, 0, 0, 0.08), 0px 16px 16px rgba(0, 0, 0, 0.06)',
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
  			}
  		},
  		animation: {
  			'accordion-down': 'accordion-down 0.2s ease-out',
  			'accordion-up': 'accordion-up 0.2s ease-out'
  		}
  	}
  },
  plugins: [require("tailwindcss-animate")],
} satisfies Config;