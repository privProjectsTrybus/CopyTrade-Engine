/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ["./src/**/*.{js,ts,jsx,tsx}"],
  theme: {
    extend: {
      colors: {
        profit: "#16c784",
        loss: "#ea3943",
      },
    },
  },
  plugins: [],
};
