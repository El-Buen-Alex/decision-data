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
        bg: "var(--bg)",
        surface: "var(--surface)",
        fg: "var(--fg)",
        "fg-2": "var(--fg-2)",
        accent: "var(--accent)",
        "accent-2": "var(--accent-2)",
        positive: "var(--positive)",
        negative: "var(--negative)",
        // Tono translúcido premezclado: Tailwind v3 descarta `bg-negative/10`
        // sobre un color declarado como `var(--negative)`.
        "negative-tint": "var(--negative-tint)",
        info: "var(--info)",
        // shadcn/ui component tokens (Button, Input, Card), mapped onto the
        // existing midnight brand palette above rather than a separate theme.
        background: "var(--bg)",
        foreground: "var(--fg)",
        primary: "var(--accent)",
        "primary-foreground": "var(--bg)",
        secondary: "var(--surface)",
        "secondary-foreground": "var(--fg)",
        muted: "var(--bg-2)",
        "muted-foreground": "var(--silver)",
        destructive: "var(--negative)",
        border: "var(--navy-mud)",
        input: "var(--navy-mud)",
        ring: "var(--accent)",
        card: "var(--surface)",
        "card-foreground": "var(--fg)",
        popover: "var(--surface)",
        "popover-foreground": "var(--fg)",
      },
    },
  },
  plugins: [],
};
export default config;
