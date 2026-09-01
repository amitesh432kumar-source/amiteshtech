"use client";

import { Plus, X } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input, Textarea } from "@/components/ui/field";
import type { FaqItem } from "@/lib/supabase/types";

export function StringListEditor({
  label,
  hint,
  items,
  onChange,
  placeholder,
}: {
  label: string;
  hint?: string;
  items: string[];
  onChange: (items: string[]) => void;
  placeholder?: string;
}) {
  return (
    <fieldset className="space-y-2">
      <legend className="text-sm font-medium">{label}</legend>
      {hint && <p className="text-xs text-muted">{hint}</p>}

      <div className="space-y-2">
        {items.map((item, index) => (
          <div key={index} className="flex gap-2">
            <Input
              value={item}
              placeholder={placeholder}
              aria-label={`${label} item ${index + 1}`}
              onChange={(event) => {
                const next = [...items];
                next[index] = event.target.value;
                onChange(next);
              }}
            />
            <Button
              type="button"
              variant="ghost"
              size="sm"
              className="size-10 shrink-0 p-0"
              aria-label={`Remove item ${index + 1}`}
              onClick={() => onChange(items.filter((_, i) => i !== index))}
            >
              <X className="size-4" />
            </Button>
          </div>
        ))}
      </div>

      <Button type="button" variant="outline" size="sm" onClick={() => onChange([...items, ""])}>
        <Plus className="size-4" aria-hidden />
        Add item
      </Button>
    </fieldset>
  );
}

export function FaqEditor({
  items,
  onChange,
}: {
  items: FaqItem[];
  onChange: (items: FaqItem[]) => void;
}) {
  return (
    <fieldset className="space-y-3">
      <legend className="text-sm font-medium">FAQ</legend>

      {items.map((item, index) => (
        <div key={index} className="space-y-2 rounded-lg border border-border p-3">
          <div className="flex gap-2">
            <Input
              value={item.question}
              placeholder="Question"
              aria-label={`FAQ question ${index + 1}`}
              onChange={(event) => {
                const next = [...items];
                next[index] = { ...next[index], question: event.target.value };
                onChange(next);
              }}
            />
            <Button
              type="button"
              variant="ghost"
              size="sm"
              className="size-10 shrink-0 p-0"
              aria-label={`Remove FAQ ${index + 1}`}
              onClick={() => onChange(items.filter((_, i) => i !== index))}
            >
              <X className="size-4" />
            </Button>
          </div>
          <Textarea
            value={item.answer}
            placeholder="Answer"
            rows={3}
            aria-label={`FAQ answer ${index + 1}`}
            onChange={(event) => {
              const next = [...items];
              next[index] = { ...next[index], answer: event.target.value };
              onChange(next);
            }}
          />
        </div>
      ))}

      <Button
        type="button"
        variant="outline"
        size="sm"
        onClick={() => onChange([...items, { question: "", answer: "" }])}
      >
        <Plus className="size-4" aria-hidden />
        Add question
      </Button>
    </fieldset>
  );
}
