/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.tsx",
    "./src/**/*.ts",
  ],
  theme: {
    extend: {
      colors: {
        primary: {
          50: "#eff6ff",
          100: "#dbeafe",
          200: "#bfdbfe",
          300: "#93c5fd",
          400: "#60a5fa",
          500: "#3b82f6",
          600: "#2563eb",
          700: "#1d4ed8",
          800: "#1e40af",
          900: "#1e3a8a",
          950: "#1a365d",
        },
        schedule: {
          lunes: "#4299e1",
          martes: "#9f7aea",
          miercoles: "#ed8936",
          jueves: "#48bb78",
          viernes: "#ed8936",
          semestral: "#718096",
          confirmar: "#ecc94b",
        },
      },
      fontFamily: {
        sans: ["Inter", "sans-serif"],
      },
      backgroundImage: {
        "gradient-header": "linear-gradient(135deg, #1a365d 0%, #3182ce 100%)",
      },
    },
  },
  plugins: [],
}
