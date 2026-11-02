import { createFileRoute } from "@tanstack/react-router";
import Cabinet from "@/pages/cabinet/Cabinet";

export const Route = createFileRoute("/cabinet")({
  ssr: false,
  head: () => ({
    meta: [{ title: "ЗАП ОПТОМ — Кабинет продаж" }],
  }),
  component: Cabinet,
});
