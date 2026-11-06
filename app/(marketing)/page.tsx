import { Closing } from "@/components/marketing/Closing";
import { Developers } from "@/components/marketing/Developers";
import { Features } from "@/components/marketing/Features";
import { Hero } from "@/components/marketing/Hero";
import { HowItWorks } from "@/components/marketing/HowItWorks";
import { Marquee } from "@/components/marketing/Marquee";
import { Nav } from "@/components/marketing/Nav";
import { Numbers } from "@/components/marketing/Numbers";
import { Principle } from "@/components/marketing/Principle";
import { Problem } from "@/components/marketing/Problem";

export default function LandingPage() {
  return (
    <div className="bg-paper">
      <Nav />
      <main>
        <Hero />
        <Marquee />
        <Problem />
        <Principle />
        <HowItWorks />
        <Developers />
        <Features />
        <Numbers />
      </main>
      <Closing />
    </div>
  );
}
