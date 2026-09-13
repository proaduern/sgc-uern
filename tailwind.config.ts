import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        uern: {
          primary: "#003366", // UERN Institutional Navy Blue
          secondary: "#0055A5",
          accent: "#D97706", // Amber / Gold for notifications & alerts
          surface: "#F8FAFC",
          card: "#FFFFFF",
          border: "#E2E8F0",
          text: "#1E293B",
          muted: "#64748B",
        }
      },
    },
  },
  plugins: [],
};
export default config;
