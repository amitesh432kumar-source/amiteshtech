"use client";

import { useState, type FormEvent } from "react";

import { Button } from "@/components/ui/button";
import { Field, Input, Textarea } from "@/components/ui/field";
import { ErrorState } from "@/components/ui/card";
import { useToast } from "@/components/ui/toast";

export function ContactForm() {
  const toast = useToast();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [sent, setSent] = useState(false);

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);

    const form = new FormData(event.currentTarget);
    const payload = {
      name: String(form.get("name") ?? "").trim(),
      email: String(form.get("email") ?? "").trim(),
      subject: String(form.get("subject") ?? "").trim(),
      message: String(form.get("message") ?? "").trim(),
    };

    if (payload.name.length < 2) return setError("Enter your name.");
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(payload.email)) return setError("Enter a valid email address.");
    if (payload.message.length < 10) return setError("Please write a little more so we can help.");

    setLoading(true);
    const response = await fetch("/api/contact", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    setLoading(false);

    if (!response.ok) {
      setError("We couldn't send your message. Please try again in a moment.");
      return;
    }

    setSent(true);
    toast("success", "Message sent — we'll be in touch.");
  }

  if (sent) {
    return (
      <div className="space-y-2 py-6 text-center">
        <p className="font-medium">Thanks for reaching out</p>
        <p className="text-sm text-muted">
          We&apos;ve received your message and will reply to the email address you gave.
        </p>
      </div>
    );
  }

  return (
    <form onSubmit={onSubmit} className="space-y-4" noValidate>
      {error && <ErrorState title={error} />}

      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Your name" required>
          {(props) => <Input {...props} name="name" autoComplete="name" required />}
        </Field>
        <Field label="Email" required>
          {(props) => <Input {...props} name="email" type="email" autoComplete="email" required />}
        </Field>
      </div>

      <Field label="Subject">{(props) => <Input {...props} name="subject" />}</Field>

      <Field label="Message" required>
        {(props) => <Textarea {...props} name="message" rows={6} required />}
      </Field>

      <Button type="submit" loading={loading}>
        Send message
      </Button>
    </form>
  );
}
