import Link from "next/link";
import {
  ArrowRight,
  BrainCircuit,
  GraduationCap,
  Globe2,
  Hammer,
  Sparkles,
  Users,
} from "lucide-react";

import { ButtonLink } from "@/components/ui/button";
import { Card, EmptyState, SectionHeading } from "@/components/ui/card";
import { CourseCategoryTabs } from "@/components/course-category-tabs";
import { WebinarCard } from "@/components/webinar-card";
import { CountdownTimer } from "@/components/countdown-timer";
import { FounderSpotlight } from "@/components/founder-spotlight";
import { TestimonialCarousel } from "@/components/testimonial-carousel";
import { ToolsMarquee } from "@/components/tools-marquee";
import { createClient } from "@/lib/supabase/server";
import { getSiteSettings, settingString } from "@/lib/settings";
import { formatDateTime, formatDuration, formatPrice } from "@/lib/utils";
import { seatsLabel } from "@/lib/webinar";
import type { Category, Course, Testimonial, Webinar } from "@/lib/supabase/types";

export const revalidate = 60;

const FEATURES = [
  { icon: Hammer, title: "Practical learning", body: "Sessions built around building things, not memorising slides." },
  { icon: Users, title: "Live webinars", body: "Ask questions in real time and learn alongside other students." },
  { icon: GraduationCap, title: "Beginner friendly", body: "Start from the basics — no prior AI background needed." },
  { icon: Globe2, title: "Learn from anywhere", body: "Everything runs online and stays in your dashboard." },
  { icon: BrainCircuit, title: "AI-focused curriculum", body: "Courses that track what AI tooling actually looks like today." },
  { icon: Sparkles, title: "Hands-on projects", body: "Finish each course with work you can show." },
];

const STEPS = [
  { title: "Choose", body: "Pick a course or an upcoming webinar." },
  { title: "Register", body: "Enroll free, or pay by PayPal or UPI." },
  { title: "Learn", body: "Work through lessons at your own pace." },
  { title: "Build", body: "Apply each module to a real project." },
  { title: "Track", body: "Watch your progress and finish the course." },
];

const FAQS = [
  {
    q: "Do I need programming experience to start?",
    a: "No. The beginner courses assume no background and introduce the tools step by step. Course pages list any requirements up front.",
  },
  {
    q: "How do I join a live webinar?",
    a: "Register on the webinar page. The joining link appears in your dashboard under My Webinars once your place is confirmed.",
  },
  {
    q: "Which payment methods can I use?",
    a: "PayPal and UPI. PayPal access is unlocked as soon as the payment is confirmed; UPI payments are unlocked after our team verifies your reference number.",
  },
  {
    q: "How long do I keep access to a course?",
    a: "Enrolled courses stay in your dashboard, so you can revisit lessons whenever you need them.",
  },
];

export default async function HomePage() {
  const supabase = await createClient();
  const settings = await getSiteSettings();

  const [webinarResult, courseResult, categoryResult, testimonialResult] = await Promise.all([
    supabase
      .from("webinars")
      .select("*")
      .eq("status", "published")
      .gte("start_at", new Date().toISOString())
      .order("start_at", { ascending: true })
      .limit(3),
    supabase
      .from("courses")
      .select("*")
      .eq("status", "published")
      .order("featured", { ascending: false })
      .order("created_at", { ascending: false })
      .limit(9),
    supabase.from("categories").select("*").order("name"),
    supabase
      .from("testimonials")
      .select("*")
      .eq("published", true)
      .order("position")
      .order("created_at", { ascending: false })
      .limit(8),
  ]);

  const webinars = (webinarResult.data ?? []) as Webinar[];
  const courses = (courseResult.data ?? []) as Course[];
  const categories = (categoryResult.data ?? []) as Category[];
  const testimonials = (testimonialResult.data ?? []) as Testimonial[];
  const nextWebinar = webinars[0];
  const communityUrl = settingString(settings, "contact.whatsapp_url");

  const founderName = settingString(settings, "founder.name");
  const founderTitle = settingString(settings, "founder.title");
  const founderBio = settingString(settings, "founder.bio");
  const founderPhoto = settingString(settings, "founder.photo_url") || null;

  return (
    <>
      <section className="relative overflow-hidden border-b border-border">
        <div className="hero-glow absolute inset-0" aria-hidden />
        <div className="grid-lines absolute inset-0 opacity-60" aria-hidden />
        <div className="container-page relative grid gap-12 py-20 lg:grid-cols-2 lg:items-center lg:py-28">
          <div className="space-y-7">
            <p className="inline-flex items-center gap-2 rounded-full border border-border bg-surface/70 px-3 py-1 text-xs font-medium text-muted">
              <Sparkles className="size-3.5 text-brand" aria-hidden />
              AI education, built for beginners
            </p>
            <h1 className="text-4xl font-semibold leading-[1.08] sm:text-5xl lg:text-6xl">
              Learn AI. Build with AI.{" "}
              <span className="bg-gradient-to-r from-brand to-accent bg-clip-text text-transparent">
                Grow with AI.
              </span>
            </h1>
            <p className="max-w-xl text-lg text-muted">
              Learn practical AI skills through live webinars and structured courses from Amitesh Tech.
            </p>
            <div className="flex flex-wrap gap-3">
              <ButtonLink href="/courses" size="lg">
                Explore Courses
                <ArrowRight className="size-4" aria-hidden />
              </ButtonLink>
              <ButtonLink href="/webinars" size="lg" variant="outline">
                Upcoming Webinars
              </ButtonLink>
            </div>
          </div>

          <div className="relative">
            {nextWebinar ? (
              <Card className="space-y-4 backdrop-blur">
                <p className="text-xs font-semibold uppercase tracking-[0.14em] text-brand">
                  Next live session
                </p>
                <h2 className="text-xl font-semibold">
                  <Link href={`/webinars/${nextWebinar.slug}`} className="hover:text-brand">
                    {nextWebinar.title}
                  </Link>
                </h2>
                {nextWebinar.short_description && (
                  <p className="text-sm text-muted">{nextWebinar.short_description}</p>
                )}
                <dl className="grid grid-cols-2 gap-3 text-sm">
                  <Detail label="Starts" value={formatDateTime(nextWebinar.start_at)} />
                  <Detail label="Duration" value={formatDuration(nextWebinar.duration) ?? "—"} />
                  <Detail label="Price" value={formatPrice(nextWebinar.price, nextWebinar.currency)} />
                  <Detail label="Seats" value={seatsLabel(nextWebinar) ?? "Open"} />
                </dl>
                <CountdownTimer startAt={nextWebinar.start_at} />
                <ButtonLink href={`/webinars/${nextWebinar.slug}`} className="w-full">
                  Register now
                </ButtonLink>
              </Card>
            ) : (
              <Card className="space-y-3 text-center">
                <p className="font-medium">No upcoming webinars yet</p>
                <p className="text-sm text-muted">
                  New live sessions are announced here. In the meantime, browse the course library.
                </p>
                <ButtonLink href="/courses" variant="outline" className="w-full">
                  Browse courses
                </ButtonLink>
              </Card>
            )}
          </div>
        </div>
      </section>

      <ToolsMarquee />

      <section className="container-page py-16">
        <div className="mb-8 flex flex-wrap items-end justify-between gap-4">
          <SectionHeading
            eyebrow="Live"
            title="Upcoming webinars"
            description="Short, focused sessions with room for your questions."
          />
          <Link href="/webinars" className="text-sm font-medium text-brand hover:text-brand-strong">
            View all →
          </Link>
        </div>
        {webinars.length > 0 ? (
          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {webinars.map((webinar) => (
              <WebinarCard key={webinar.id} webinar={webinar} />
            ))}
          </div>
        ) : (
          <EmptyState
            title="No upcoming webinars yet."
            description="Check back soon — new sessions are published here as they're scheduled."
          />
        )}
      </section>

      <section className="border-y border-border bg-surface-muted/40 py-16">
        <div className="container-page">
          <div className="mb-8 flex flex-wrap items-end justify-between gap-4">
            <SectionHeading
              eyebrow="Courses"
              title="Featured courses"
              description="Structured paths you can work through at your own pace."
            />
            <Link href="/courses" className="text-sm font-medium text-brand hover:text-brand-strong">
              View all →
            </Link>
          </div>
          {courses.length > 0 ? (
            <CourseCategoryTabs courses={courses} categories={categories} />
          ) : (
            <EmptyState
              title="No courses available yet."
              description="The course library is being built. Follow along for the first release."
            />
          )}
        </div>
      </section>

      <section className="container-page py-16">
        <SectionHeading
          eyebrow="Why Amitesh Tech"
          title="Built for people who want to actually use AI"
          align="center"
        />
        <div className="mt-10 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {FEATURES.map(({ icon: Icon, title, body }) => (
            <Card key={title} className="space-y-3">
              <span className="grid size-10 place-items-center rounded-lg bg-brand-soft text-brand">
                <Icon className="size-5" aria-hidden />
              </span>
              <h3 className="font-semibold">{title}</h3>
              <p className="text-sm text-muted">{body}</p>
            </Card>
          ))}
        </div>
      </section>

      <section className="border-y border-border bg-surface-muted/40 py-16">
        <div className="container-page">
          <SectionHeading eyebrow="How it works" title="From first lesson to finished project" align="center" />
          <ol className="mt-10 grid gap-5 sm:grid-cols-2 lg:grid-cols-5">
            {STEPS.map((step, index) => (
              <li key={step.title} className="rounded-card border border-border bg-surface p-5">
                <span className="text-xs font-semibold text-brand">Step {index + 1}</span>
                <h3 className="mt-2 font-semibold">{step.title}</h3>
                <p className="mt-1 text-sm text-muted">{step.body}</p>
              </li>
            ))}
          </ol>
        </div>
      </section>

      {founderName && (
        <FounderSpotlight
          name={founderName}
          title={founderTitle}
          bio={founderBio}
          photoUrl={founderPhoto}
        />
      )}

      {testimonials.length > 0 && (
        <section className="container-page py-16">
          <SectionHeading eyebrow="Reviews" title="Loved by students learning AI" align="center" />
          <div className="mt-10">
            <TestimonialCarousel testimonials={testimonials} />
          </div>
        </section>
      )}

      <section className="container-page grid gap-10 py-16 lg:grid-cols-2 lg:items-start">
        <div className="space-y-4">
          <SectionHeading eyebrow="About" title="About Amitesh Tech" />
          <p className="text-muted">
            Amitesh Tech is an online school for practical AI. We publish structured courses and run
            live webinars that focus on the tools people are actually using — how to prompt them, how
            to build with them, and how to judge what they produce.
          </p>
          <p className="text-muted">
            Every course is designed to end with something you have built yourself, and your progress
            stays in your dashboard so you can pick up where you left off.
          </p>
          <ButtonLink href="/about" variant="outline">
            More about us
          </ButtonLink>
        </div>

        <div>
          <h2 className="mb-5 text-2xl font-semibold">Frequently asked questions</h2>
          <div className="space-y-3">
            {FAQS.map((faq) => (
              <details
                key={faq.q}
                className="group rounded-card border border-border bg-surface p-5 [&_summary::-webkit-details-marker]:hidden"
              >
                <summary className="flex cursor-pointer items-center justify-between gap-4 font-medium">
                  {faq.q}
                  <span className="text-muted transition-transform group-open:rotate-45" aria-hidden>
                    +
                  </span>
                </summary>
                <p className="mt-3 text-sm text-muted">{faq.a}</p>
              </details>
            ))}
          </div>
        </div>
      </section>

      {communityUrl && (
        <section className="container-page pb-20">
          <div className="rounded-card border border-border bg-brand-soft p-8 text-center sm:p-12">
            <h2 className="text-2xl font-semibold">Join the Amitesh Tech community</h2>
            <p className="mx-auto mt-2 max-w-lg text-muted">
              Get session announcements, resources and answers to your questions between classes.
            </p>
            <a
              href={communityUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="mt-6 inline-flex h-11 items-center rounded-lg bg-brand px-6 text-sm font-medium text-white hover:bg-brand-strong"
            >
              Join the community
            </a>
          </div>
        </section>
      )}
    </>
  );
}

function Detail({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <dt className="text-xs text-muted">{label}</dt>
      <dd className="font-medium">{value}</dd>
    </div>
  );
}
