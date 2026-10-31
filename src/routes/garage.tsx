import { createFileRoute } from "@tanstack/react-router";
import Garage from "@/pages/Garage";

// Вход в «Гараж» хранится в localStorage — сервер о нём не знает,
// поэтому страница рендерится только в браузере.
export const Route = createFileRoute("/garage")({
  ssr: false,
  component: Garage,
});
