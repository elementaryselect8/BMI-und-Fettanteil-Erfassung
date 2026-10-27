import { createFileRoute } from "@tanstack/react-router";
import { Korpus } from "@/components/korpus";

export const Route = createFileRoute("/")({ component: Home });

function Home() {
  return <Korpus />;
}
