import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/lib/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        // TasteStack dark theme palette (matches the mockup)
        ink: {
          950: "#0f1419", // page background
          900: "#14202c", // card background
          850: "#1a2735", // hover/elevated
          800: "#1f2c3a", // borders
          700: "#2a3a4d", // input borders
          600: "#56677a", // muted text
          500: "#8899aa", // secondary text
          400: "#b8c2cc", // body subtle
          300: "#e6e6e6", // primary text
        },
        brand: {
          500: "#3db4f2", // primary cyan-blue
          600: "#2e51a2", // deeper blue
        },
        gold: "#f5a623",
        danger: "#d0021b",
        success: "#7ed321",
      },
      fontFamily: {
        sans: [
          "-apple-system",
          "BlinkMacSystemFont",
          "Segoe UI",
          "Roboto",
          "sans-serif",
        ],
      },
    },
  },
  plugins: [],
};

export default config;
