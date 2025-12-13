/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ["./app/**/*.{js,jsx,ts,tsx}", "./components/**/*.{js,jsx,ts,tsx}"],
  presets: [require("nativewind/preset")],
  theme: {
    extend: {
      fontFamily: {
        atkinson: ["AtkinsonHyperlegible_400Regular"],
        "atkinson-bold": ["AtkinsonHyperlegible_700Bold"],
        "atkinson-italic": ["AtkinsonHyperlegible_400Regular_Italic"],
        "atkinson-bold-italic": ["AtkinsonHyperlegible_700Bold_Italic"],
      },
    },
  },
  plugins: [],
};