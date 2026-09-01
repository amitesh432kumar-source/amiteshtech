"use client";

import { useMemo, useState, type FormEvent } from "react";
import { Country, State } from "country-state-city";
import { CheckCircle2 } from "lucide-react";

import { submitStudentRegistration } from "@/app/(site)/register/actions";
import { Button } from "@/components/ui/button";
import { Card, ErrorState } from "@/components/ui/card";
import { Field, Input, Select } from "@/components/ui/field";

const COUNTRIES = Country.getAllCountries();

const EMPTY_ERRORS = {
  full_name: "",
  email: "",
  mobile_number: "",
  country: "",
  state: "",
  city: "",
};

type Errors = typeof EMPTY_ERRORS;

export function RegisterForm() {
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [dialCode, setDialCode] = useState("91");
  const [phone, setPhone] = useState("");
  const [countryCode, setCountryCode] = useState("");
  const [stateCode, setStateCode] = useState("");
  const [city, setCity] = useState("");

  const [errors, setErrors] = useState<Errors>(EMPTY_ERRORS);
  const [formError, setFormError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [success, setSuccess] = useState(false);

  const states = useMemo(
    () => (countryCode ? State.getStatesOfCountry(countryCode) : []),
    [countryCode],
  );

  function onCountryChange(nextCountryCode: string) {
    setCountryCode(nextCountryCode);
    // A country change invalidates whatever state was previously selected.
    setStateCode("");
  }

  function reset() {
    setFullName("");
    setEmail("");
    setPhone("");
    setCountryCode("");
    setStateCode("");
    setCity("");
    setErrors(EMPTY_ERRORS);
  }

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (submitting) return;
    setFormError(null);

    const country = COUNTRIES.find((c) => c.isoCode === countryCode);
    const state = states.find((s) => s.isoCode === stateCode);
    const mobile = `+${dialCode}${phone.replace(/\D/g, "")}`;

    const nextErrors: Errors = { ...EMPTY_ERRORS };
    if (fullName.trim().length < 2) nextErrors.full_name = "Enter the student's full name.";
    if (!/^\S+@\S+\.\S+$/.test(email.trim())) nextErrors.email = "Enter a valid email address.";
    if (!/^\+\d{7,16}$/.test(mobile)) nextErrors.mobile_number = "Enter a valid mobile number.";
    if (!country) nextErrors.country = "Select a country.";
    if (states.length > 0 && !state) nextErrors.state = "Select a state.";
    if (!city.trim()) nextErrors.city = "Enter a city.";

    setErrors(nextErrors);
    if (Object.values(nextErrors).some(Boolean)) return;

    setSubmitting(true);
    const result = await submitStudentRegistration({
      full_name: fullName.trim(),
      email: email.trim(),
      mobile_number: mobile,
      country: country!.name,
      state: state?.name ?? "—",
      city: city.trim(),
      website: "",
    });
    setSubmitting(false);

    if (!result.ok) {
      setFormError(result.error);
      return;
    }

    setSuccess(true);
    reset();
  }

  if (success) {
    return (
      <Card className="space-y-3 p-8 text-center">
        <CheckCircle2 className="mx-auto size-10 text-success" aria-hidden />
        <h2 className="text-xl font-semibold">Registration successful!</h2>
        <p className="text-muted">
          Thank you for registering with Amitesh Tech. We will contact you soon.
        </p>
        <Button type="button" variant="outline" onClick={() => setSuccess(false)}>
          Register another student
        </Button>
      </Card>
    );
  }

  return (
    <Card className="p-7 sm:p-8">
      <form onSubmit={onSubmit} className="space-y-5" noValidate>
        {formError && <ErrorState title={formError} />}

        {/* Honeypot — hidden from real users via CSS, never via display:none (bots skip that). */}
        <div className="absolute -left-[9999px]" aria-hidden>
          <label htmlFor="website">Leave blank</label>
          <input id="website" name="website" type="text" tabIndex={-1} autoComplete="off" />
        </div>

        <Field label="Full Name" required error={errors.full_name}>
          {(props) => (
            <Input
              {...props}
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              placeholder="Enter student's full name"
              required
            />
          )}
        </Field>

        <Field label="Email Address" required error={errors.email}>
          {(props) => (
            <Input
              {...props}
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="Enter student's email address"
              required
            />
          )}
        </Field>

        <Field label="Mobile Number" required error={errors.mobile_number}>
          {(props) => (
            <div className="flex gap-2">
              <select
                aria-label="Country dial code"
                value={dialCode}
                onChange={(e) => setDialCode(e.target.value)}
                className="w-28 rounded-lg border border-border bg-surface px-2 py-2.5 text-sm text-foreground focus:border-brand"
              >
                {COUNTRIES.map((c) => (
                  <option key={c.isoCode} value={c.phonecode}>
                    {c.flag} +{c.phonecode}
                  </option>
                ))}
              </select>
              <Input
                {...props}
                type="tel"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                placeholder="Enter student's mobile number"
                className="flex-1"
                required
              />
            </div>
          )}
        </Field>

        <div className="grid gap-5 sm:grid-cols-2">
          <Field label="Country" required error={errors.country}>
            {(props) => (
              <Select
                {...props}
                value={countryCode}
                onChange={(e) => onCountryChange(e.target.value)}
                required
              >
                <option value="">Select country</option>
                {COUNTRIES.map((c) => (
                  <option key={c.isoCode} value={c.isoCode}>
                    {c.name}
                  </option>
                ))}
              </Select>
            )}
          </Field>

          <Field label="State" required error={errors.state}>
            {(props) => (
              <Select
                {...props}
                value={stateCode}
                onChange={(e) => setStateCode(e.target.value)}
                disabled={!countryCode || states.length === 0}
                required={states.length > 0}
              >
                <option value="">
                  {!countryCode
                    ? "Select a country first"
                    : states.length === 0
                      ? "No states listed for this country"
                      : "Select state"}
                </option>
                {states.map((s) => (
                  <option key={s.isoCode} value={s.isoCode}>
                    {s.name}
                  </option>
                ))}
              </Select>
            )}
          </Field>
        </div>

        <Field label="City" required error={errors.city}>
          {(props) => (
            <Input
              {...props}
              value={city}
              onChange={(e) => setCity(e.target.value)}
              placeholder="Enter city"
              required
            />
          )}
        </Field>

        <Button type="submit" size="lg" loading={submitting} disabled={submitting} className="w-full">
          Register Now
        </Button>
      </form>
    </Card>
  );
}
