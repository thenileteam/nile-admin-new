export default {
  content: ["./index.html", "./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        ink: {
          50: "#f7f7f8",
          100: "#eceef1",
          200: "#d6dae1",
          400: "#8a93a3",
          600: "#4a5261",
          800: "#232833",
          900: "#151922",
        },
        brand: {
          50: "#eef7f1",
          100: "#d7ebdf",
          200: "#b7dac3",
          500: "#2f8f5b",
          600: "#004324",
          700: "#00331b",
          800: "#002516",
        },
      },
      fontFamily: {
        sans: ["Inter", "ui-sans-serif", "system-ui", "sans-serif"],
      },
      boxShadow: {
        card: "0 1px 2px rgba(21, 25, 34, 0.06), 0 1px 3px rgba(21, 25, 34, 0.04)",
      },
    },
  },
  plugins: [],
};
