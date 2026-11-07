import type { Metadata } from "next";
import { DemoApp } from "@/components/demo/DemoApp";

export const metadata: Metadata = { title: "Example SaaS app" };

export default function DemoPage() {
  return <DemoApp />;
}
