import type { Metadata } from "next";
import Image from "next/image";
import { BrainCircuit, Hammer, Users } from "lucide-react";

import { ButtonLink } from "@/components/ui/button";
import { Card, SectionHeading } from "@/components/ui/card";
import { getSiteSettings, settingString } from "@/lib/settings";

export const metadata: Metadata = {
  title: "About",
  description:
    "Amitesh Tech is an online school for practical AI — structured courses and live webinars that focus on building real things.",
  alternates: { canonical: "/about" },
};

const PRINCIPLES = [
  {
    icon: Hammer,
    title: "Build, don't just watch",
    body: "Every course ends with something you made yourself. Lessons are short and lead into practice.",
  },
  {
    icon: BrainCircuit,
    title: "Teach the current tools",
    body: "AI tooling moves quickly. Material is revised so what you learn reflects how these tools work now.",
  },
  {
    icon: Users,
    title: "Answer real questions",
    body: "Live webinars leave room for questions, because the gap between a demo and your own work is where people get stuck.",
  },
];

const TOPICS = [
  { emoji: "🤖", label: "Artificial Intelligence & AI tools" },
  { emoji: "📱", label: "Building Android & iOS apps with AI" },
  { emoji: "🌐", label: "Website development with AI" },
  { emoji: "🧠", label: "AI for beginners" },
  { emoji: "🚀", label: "Practical technology & projects" },
];

export default async function AboutPage() {
  const settings = await getSiteSettings();
  const photoUrl = settingString(settings, "founder.photo_url") || null;

  return (
    <>
      <section className="relative overflow-hidden border-b border-border">
        <div className="hero-glow absolute inset-0" aria-hidden />
        <div className="container-page relative py-20">
          <h1 className="max-w-3xl text-4xl font-semibold sm:text-5xl">
            An online school for people who want to actually use AI
          </h1>
          <p className="mt-5 max-w-2xl text-lg text-muted">
            Amitesh Tech publishes structured courses and runs live webinars on practical AI — how to
            use the tools, how to build with them, and how to judge what they produce.
          </p>
        </div>
      </section>

      <section className="container-page grid gap-12 py-16 lg:grid-cols-2">
        <div className="space-y-4">
          <SectionHeading eyebrow="Our approach" title="Learning that ends in something built" />
          <p className="text-muted">
            Most AI material either stops at theory or turns into a tour of buttons. We aim for the
            middle: enough understanding to make decisions, and enough practice that you finish with
            working output.
          </p>
          <p className="text-muted">
            Courses are broken into modules and short lessons so you can fit them around other work.
            Your progress is saved as you go, and completed courses stay available in your dashboard.
          </p>
          <p className="text-muted">
            Live webinars cover focused topics in a single sitting. They are the place to bring the
            questions that a recorded lesson cannot anticipate.
          </p>
        </div>

        <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-1">
          {PRINCIPLES.map(({ icon: Icon, title, body }) => (
            <Card key={title} className="space-y-3">
              <span className="grid size-10 place-items-center rounded-lg bg-brand-soft text-brand">
                <Icon className="size-5" aria-hidden />
              </span>
              <h2 className="font-semibold">{title}</h2>
              <p className="text-sm text-muted">{body}</p>
            </Card>
          ))}
        </div>
      </section>

      <section className="border-y border-border bg-surface-muted/40 py-16">
        <div className="container-page grid gap-10 lg:grid-cols-[220px_1fr]">
          <div className="relative mx-auto aspect-square w-40 overflow-hidden rounded-full border border-border bg-surface lg:w-full">
            {photoUrl ? (
              <Image src={photoUrl} alt="Amitesh Kumar" fill sizes="220px" className="object-cover" />
            ) : (
              <span className="grid h-full place-items-center text-2xl font-semibold text-muted">
                AK
              </span>
            )}
          </div>

          <div className="space-y-5">
            <SectionHeading eyebrow="Meet your instructor" title="Amitesh Kumar" />
            <div className="space-y-4 text-muted">
              <p>
                Hi, I&rsquo;m Amitesh Kumar, the instructor and creator of Amitesh Tech.
              </p>
              <p>
                I&rsquo;m passionate about Artificial Intelligence, technology, apps, and websites.
                Through Amitesh Tech, my goal is to make modern technology and AI easier to understand
                and use — even for beginners.
              </p>
              <p>
                I create practical courses, live classes, and workshops designed to help students learn
                by building real projects. Whether you&rsquo;re just getting started with AI or want to
                explore how AI can be used to create apps and websites, I&rsquo;m here to guide you step
                by step.
              </p>
            </div>

            <div>
              <h3 className="font-semibold text-foreground">What I teach</h3>
              <ul className="mt-3 space-y-2">
                {TOPICS.map((topic) => (
                  <li key={topic.label} className="flex items-center gap-2.5 text-muted">
                    <span aria-hidden>{topic.emoji}</span>
                    {topic.label}
                  </li>
                ))}
              </ul>
            </div>

            <div>
              <h3 className="font-semibold text-foreground">My mission</h3>
              <p className="mt-2 text-muted">
                To make AI and modern technology simple, practical, and accessible — so that anyone can
                learn, create, and turn their ideas into real projects.
              </p>
            </div>

            <p className="font-medium text-foreground">
              Learn. Build. Create with AI.
              <br />
              <span className="text-muted">— Amitesh Kumar</span>
            </p>
          </div>
        </div>
      </section>

      <section className="container-page pb-20">
        <div className="rounded-card border border-border bg-surface-muted/50 p-8 text-center sm:p-12">
          <h2 className="text-2xl font-semibold">Ready to start?</h2>
          <p className="mx-auto mt-2 max-w-lg text-muted">
            Browse the course library or find the next live session.
          </p>
          <div className="mt-6 flex flex-wrap justify-center gap-3">
            <ButtonLink href="/courses">Explore courses</ButtonLink>
            <ButtonLink href="/webinars" variant="outline">
              Upcoming webinars
            </ButtonLink>
          </div>
        </div>
      </section>
    </>
  );
}
