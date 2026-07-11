import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/features/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/lib/**/*.{js,ts,jsx,tsx,mdx}"
  ],
  theme: {
    extend: {
      colors: {
        graphite: {
          950: "#050607",
          900: "#090b0d",
          850: "#101316",
          800: "#171b1f",
          700: "#252b31"
        },
        terminal: {
          yellow: "#f7c948",
          amber: "#ffb020",
          green: "#30d158",
          red: "#ff453a",
          cyan: "#41d6ff"
        }
      },
      boxShadow: {
        terminal: "0 0 0 1px rgba(247,201,72,0.14), 0 18px 60px rgba(0,0,0,0.34)"
      }
    }
  },
  plugins: []
};

export default config;
