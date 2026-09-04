import type { Config } from "tailwindcss";

const config: Config = {
  content: ["app/**/*.{ts,tsx}", "lib/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        fundo: "#FAFAF9",
        superficie: "#FFFFFF",
        borda: "#E5E7EB",
        "fundo-hover": "#F5F5F4",
        grafite: "#FAFAF9",
        carvao: "#FFFFFF",
        "carvao-claro": "#E5E7EB",
        "brasa-clara": "#FF6B35",
        brasa: "#E8432E",
        "brasa-escura": "#B91F1F",
        ambar: "#F5A623",
        "verde-sucesso": "#34D399",
        "vermelho-erro": "#FF4D4D",
        "texto-primario": "#1A1D23",
        "texto-secundario": "#6B7280",
        "laranja-bg": "#FFF1EA",
        "laranja-texto": "#E8432E",
        "ambar-bg": "#FFF8E5",
        "ambar-texto": "#F5A623",
        "coral-bg": "#FDECEC",
        "coral-texto": "#E5484D",
        "verde-bg": "#E9F9F0",
        "verde-texto": "#1FA971",
        "azul-bg": "#EAF2FE",
        "azul-texto": "#2B6CE0",
      },
      screens: {
        tv: "1920px",
      },
      backgroundImage: {
        "gradiente-brasa":
          "linear-gradient(135deg, #FF6B35 0%, #E8432E 50%, #B91F1F 100%)",
      },
    },
  },
};

export default config;
