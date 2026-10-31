import { createFileRoute } from "@tanstack/react-router";
import Admin from "@/pages/Admin";

// Вход менеджера хранится в браузерном хранилище — сервер о нём не знает,
// поэтому админка рендерится только в браузере.
export const Route = createFileRoute("/admin")({
  ssr: false,
  head: () => ({
    meta: [{ title: "ЗАП ОПТОМ — Заявки" }],
  }),
  component: Admin,
});
