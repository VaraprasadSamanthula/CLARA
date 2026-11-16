/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        primary: "#6ee7c8",
        secondary: "#38c9a5",
        dark: {
          100: "#e8f1ef",
          200: "#91aaa7",
          300: "#607875",
          400: "#10211f",
          500: "#142a27",
          600: "#0a1615",
        },
      },
    },
  },
  plugins: [],
};
