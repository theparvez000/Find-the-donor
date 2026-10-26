import type { Config } from "tailwindcss";
export default { content: ["./app/**/*.{ts,tsx}"], theme: { extend: { colors: { brand: { 50:"#fef2f2",600:"#b91c1c",700:"#991b1b",900:"#450a0a" } } } }, plugins: [] } satisfies Config;
