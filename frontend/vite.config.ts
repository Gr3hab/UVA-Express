import { defineConfig } from "vite";
import react from "@vitejs/plugin-react-swc";
import path from "path";
import { componentTagger } from "lovable-tagger";

// UVA Express – https://vitejs.dev/config/
export default defineConfig(({ mode }) => ({
  server: {
    host: "::",
    port: 3000,
    allowedHosts: true,
    hmr: {
      overlay: false,
    },
  },
  define: {
    // Fallback: ensure env vars are always available even if .env is missing
    'import.meta.env.VITE_SUPABASE_URL': JSON.stringify(process.env.VITE_SUPABASE_URL || "https://lljdgjnwcjartondpqfw.supabase.co"),
    'import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY': JSON.stringify(process.env.VITE_SUPABASE_PUBLISHABLE_KEY || "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImxsamRnam53Y2phcnRvbmRwcWZ3Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzA5MDMzOTIsImV4cCI6MjA4NjQ3OTM5Mn0.LB3xSleicVa4StvA6lP4RyB1d4tQR4drq9WwXgXNOHk"),
  },
  optimizeDeps: {
    force: true,
  },
  plugins: [react(), mode === "development" && componentTagger()].filter(Boolean),
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
}));
