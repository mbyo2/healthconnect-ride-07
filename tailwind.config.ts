
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
      padding: {
        DEFAULT: "1rem",
        sm: "1.5rem",
        md: "2rem",
        lg: "2.5rem",
        xl: "3rem",
        "2xl": "3.5rem",
        "3xl": "4rem",
        "4xl": "4.5rem",
      },
      screens: {
        sm: "640px",
        md: "768px",
        lg: "1024px",
        xl: "1280px",
        "2xl": "1400px",
        "3xl": "1600px",
        "4xl": "1920px",
        "5xl": "2560px",
      },
    },
    extend: {
      maxWidth: {
        '8xl': '88rem',
        '9xl': '96rem',
        // Editorial content width (Voiceflow-inspired)
        'content': '75rem',
      },
      height: {
        '18': '4.5rem',
        '20': '5rem',
      },
      colors: {
        border: "hsl(var(--border))",
        input: "hsl(var(--input))",
        ring: "hsl(var(--ring))",
        background: "hsl(var(--background))",
        foreground: "hsl(var(--foreground))",
        // Signal Blue — primary actions (Voiceflow-inspired)
        primary: {
          DEFAULT: "#397dff",
          foreground: "#ffffff",
          50: "#f0f5ff",
          100: "#e0ebff",
          200: "#c2d7ff",
          300: "#94bfff",
          400: "#5da3ff",
          500: "#397dff",
          600: "#2563eb",
          700: "#1d4ed8",
          800: "#1e40af",
          900: "#1e3a8a",
        },
        // Ember Stroke — accents (Voiceflow-inspired)
        accent: {
          DEFAULT: "#f55c15",
          foreground: "#ffffff",
          50: "#fff0eb",
          100: "#ffe0d4",
          200: "#ffc0a9",
          300: "#ff9a7e",
          400: "#ff7453",
          500: "#f55c15",
          600: "#d94a0e",
          700: "#b83d0c",
          800: "#97310a",
          900: "#7b2509",
        },
        secondary: {
          DEFAULT: "hsl(var(--secondary))",
          foreground: "hsl(var(--secondary-foreground))",
        },
        destructive: {
          DEFAULT: "hsl(var(--destructive))",
          foreground: "hsl(var(--destructive-foreground))",
        },
        muted: {
          DEFAULT: "hsl(var(--muted))",
          foreground: "hsl(var(--muted-foreground))",
        },
        popover: {
          DEFAULT: "hsl(var(--popover))",
          foreground: "hsl(var(--popover-foreground))",
        },
        card: {
          DEFAULT: "hsl(var(--card))",
          foreground: "hsl(var(--card-foreground))",
        },
        // Editorial neutrals (Voiceflow graphite scale) - Updated for better contrast
        graphite: {
          50: "#fafafa",
          100: "#f5f5f4",
          200: "#e7e5e4",
          300: "#d6d3d1",
          400: "#a8a29e",
          500: "#57534e",  // Darker for better contrast
          600: "#44403c",  // Darker for better contrast
          700: "#292524",  // Darker for better contrast
          800: "#1c1917",
          900: "#0c0a09",
          950: "#000000",
        },
        canvas: {
          DEFAULT: "#ffffff",
          bone: "#f5f5f4",
          mist: "#edeeee",
          silk: "#e5e5e5",
        },
        midnight: "#171717",
        charcoal: "#262626",
        slate: {
          50: "#F8FAFC",
          100: "#F1F5F9",
          200: "#E2E8F0",
          300: "#CBD5E1",
          400: "#94A3B8",
          500: "#64748B",
          600: "#475569",
          700: "#334155",
          800: "#1E293B",
          900: "#0F172A",
        },
        success: {
          50: "#F0FDF4",
          100: "#DCFCE7",
          200: "#BBF7D0",
          300: "#86EFAC",
          400: "#4ADE80",
          500: "#22C55E",
        },
        alert: {
          50: "#FEF2F2",
          100: "#FEE2E2",
          200: "#FECACA",
          300: "#FCA5A5",
          400: "#F87171",
          500: "#EF4444",
        },
        trust: {
          50: "rgb(var(--trust-50))",
          100: "rgb(var(--trust-100))",
          200: "rgb(var(--trust-200))",
          300: "rgb(var(--trust-300))",
          400: "rgb(var(--trust-400))",
          500: "rgb(var(--trust-500))",
          600: "rgb(var(--trust-600))",
          700: "rgb(var(--trust-700))",
          800: "rgb(var(--trust-800))",
          900: "rgb(var(--trust-900))",
        },
        amazon: {
          orange: "rgb(255, 153, 0)",
          blue: "rgb(35, 47, 62)",
          lightBlue: "rgb(0, 113, 227)",
          gray: "rgb(248, 248, 248)",
        },
      },
      borderRadius: {
        lg: "var(--radius)",
        md: "calc(var(--radius) - 2px)",
        sm: "calc(var(--radius) - 4px)",
        pill: "999px",
        card: "20px",
        nav: "100px",
      },
      keyframes: {
        "accordion-down": {
          from: { height: "0" },
          to: { height: "var(--radix-accordion-content-height)" },
        },
        "accordion-up": {
          from: { height: "var(--radix-accordion-content-height)" },
          to: { height: "0" },
        },
        "fadeIn": {
          "0%": { opacity: "0", transform: "translateY(20px)" },
          "100%": { opacity: "1", transform: "translateY(0)" }
        },
        "slideIn": {
          "0%": { transform: "translateX(-100%)" },
          "100%": { transform: "translateX(0)" }
        },
        "bounceIn": {
          "0%, 20%, 40%, 60%, 80%": { transform: "translateY(-6px)" },
          "100%": { transform: "translateY(0)" }
        },
        "float": {
          "0%, 100%": { transform: "translateY(0px)" },
          "50%": { transform: "translateY(-10px)" }
        },
        "heroRise": {
          "0%": { opacity: "0", transform: "translateY(28px)" },
          "100%": { opacity: "1", transform: "translateY(0)" }
        },
        "softPulse": {
          "0%, 100%": { opacity: "0.55" },
          "50%": { opacity: "1" }
        }
      },
      animation: {
        "accordion-down": "accordion-down 0.2s ease-out",
        "accordion-up": "accordion-up 0.2s ease-out",
        "fadeIn": "fadeIn 0.6s ease-out forwards",
        "slideIn": "slideIn 0.4s ease-out",
        "bounceIn": "bounceIn 1s ease-out",
        "float": "float 3s ease-in-out infinite",
        "hero-rise": "heroRise 0.8s cubic-bezier(0.22, 1, 0.36, 1) forwards",
        "soft-pulse": "softPulse 3.5s ease-in-out infinite",
      },
      backgroundImage: {
        'grid-pattern': "linear-gradient(to right, #f3f4f6 1px, transparent 1px), linear-gradient(to bottom, #f3f4f6 1px, transparent 1px)",
        'gradient-radial': 'radial-gradient(var(--tw-gradient-stops))',
        'hero-wash': 'radial-gradient(ellipse 80% 60% at 50% 0%, rgba(57,125,255,0.08), transparent 60%), radial-gradient(ellipse 50% 40% at 90% 20%, rgba(245,92,21,0.06), transparent 50%)',
      },
      boxShadow: {
        'card': '0 10px 40px rgba(0, 0, 0, 0.04)',
        'card-hover': '0 20px 60px rgba(0, 0, 0, 0.08)',
        'button': '0 1px 2px 0 rgba(0, 0, 0, 0.05)',
        'button-hover': '0 2px 4px 0 rgba(0, 0, 0, 0.1)',
        'glass': '0 8px 32px rgba(0, 0, 0, 0.08)',
        'pill-nav': '0 8px 32px rgba(23, 23, 23, 0.08), 0 1px 0 rgba(255,255,255,0.8) inset',
      },
      fontFamily: {
        // Fraunces ≈ Tiempos editorial serif; Figtree ≈ Selecta humanist sans
        serif: ['Fraunces', 'Georgia', 'Times New Roman', 'serif'],
        sans: ['Figtree', 'system-ui', '-apple-system', 'sans-serif'],
        display: ['Fraunces', 'Georgia', 'serif'],
      },
      fontSize: {
        'display': ['4rem', { lineHeight: '1', fontWeight: '300', letterSpacing: '-0.02em' }],
        'heading-lg': ['3.5rem', { lineHeight: '1.14', fontWeight: '300', letterSpacing: '-0.015em' }],
        '4xl': '2.25rem',
        '5xl': '3rem',
        '6xl': '3.75rem',
        '7xl': '4.5rem',
        'base': '1rem',
      },
      letterSpacing: {
        'wide': '0.025em',
        'wider': '0.05em',
      },
      spacing: {
        '18': '4.5rem',
        '88': '22rem',
        'section': '6rem',
        'section-lg': '7.5rem',
        'card': '1.5rem',
        'gap': '0.75rem',
        'gap-lg': '1.5rem',
      },
    },
  },
  plugins: [require("tailwindcss-animate")],
} satisfies Config;
