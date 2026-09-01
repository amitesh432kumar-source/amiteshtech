import type { Metadata } from "next";
import { GraduationCap } from "lucide-react";

import { RegisterForm } from "@/app/(site)/register/register-form";

export const metadata: Metadata = {
  title: "Student Registration",
  description: "Register as a student with Amitesh Tech.",
  alternates: { canonical: "/register" },
};

export default function RegisterPage() {
  return (
    <section className="relative overflow-hidden">
      <div className="hero-glow absolute inset-0 -z-10" aria-hidden />
      <div className="container-page py-16 sm:py-20">
        <div className="mx-auto max-w-xl text-center">
          <span className="mx-auto grid size-12 place-items-center rounded-xl bg-brand-soft text-brand">
            <GraduationCap className="size-6" aria-hidden />
          </span>
          <h1 className="mt-4 text-3xl font-semibold sm:text-4xl">Student Registration Form</h1>
          <p className="mt-3 text-muted">
            Please fill in the details below to register as a student at Amitesh Tech.
          </p>
        </div>

        <div className="mx-auto mt-10 max-w-xl">
          <RegisterForm />
        </div>
      </div>
    </section>
  );
}
