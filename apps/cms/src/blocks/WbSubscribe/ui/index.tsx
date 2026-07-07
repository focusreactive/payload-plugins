"use client";

import { useState } from "react";

import { cn } from "@/components/utils";
import { Eyebrow, Pill } from "@/components/wb/primitives";

import type { WbSubscribePlan, WbSubscribeProps } from "./types";

function PlanTag({ plan }: { plan: WbSubscribePlan }) {
  return (
    <Pill
      variant="soft"
      className={cn(
        "px-[11px] py-[3px] text-[11px] font-semibold",
        plan.tagTone === "paid" && "bg-primary text-white"
      )}
    >
      {plan.tagLabel}
    </Pill>
  );
}

function PlanCard({
  plan,
  selected,
  onSelect,
}: {
  plan: WbSubscribePlan;
  selected: boolean;
  onSelect: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onSelect}
      aria-pressed={selected}
      className={cn(
        "block w-full rounded-sm border p-6 text-left transition-colors hover:border-secondary hover:bg-wash",
        selected ? "border-secondary bg-wash" : "border-border bg-white"
      )}
    >
      <div className="mb-3 flex items-center justify-between">
        <h3 className="m-0 font-display text-[18px] font-semibold text-foreground">{plan.title}</h3>
        <PlanTag plan={plan} />
      </div>
      <p className="m-0 mb-6 text-[13.5px] leading-[1.5] text-muted-foreground">
        {plan.description}
      </p>
      <div className="flex items-center justify-between">
        <span className="text-[14px] font-semibold text-primary">{plan.cta} →</span>
        {plan.note ? <span className="text-[11.5px] text-faint">{plan.note}</span> : null}
      </div>
    </button>
  );
}

export function WbSubscribe({
  eyebrow,
  title,
  plans,
  defaultPlanValue,
  detailsLabel = "Your details",
  emailPlaceholder = "Email address",
  firstNamePlaceholder = "First name",
  lastNamePlaceholder = "Last name",
  companyPlaceholder = "Company",
  regions = ["UK & Europe", "Asia-Pacific", "North America", "Global"],
  defaultRegion,
  agreeLabel = "I agree to receive emails from WealthBriefing and ClearView Financial Media.",
  submitLabel = "Subscribe",
  errorMessage = "Please enter your email and accept the terms.",
  privacyText = "You can unsubscribe at any time. Read our",
  privacyLinkLabel = "Privacy Policy",
  privacyHref = "#",
  successTitle = "You're subscribed",
  successBody = "Thank you. You'll start receiving WealthBriefing intelligence by email. You can unsubscribe at any time.",
  successCtaLabel = "Subscribe another address",
}: WbSubscribeProps) {
  const initialRegion = defaultRegion ?? regions[0] ?? "";
  const [selectedPlan, setSelectedPlan] = useState(defaultPlanValue ?? plans[0]?.value ?? "");
  const [email, setEmail] = useState("");
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [company, setCompany] = useState("");
  const [region, setRegion] = useState(initialRegion);
  const [agree, setAgree] = useState(false);
  const [formError, setFormError] = useState(false);
  const [subscribed, setSubscribed] = useState(false);

  function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!email || !agree) {
      setFormError(true);
      return;
    }
    setFormError(false);
    setSubscribed(true);
  }

  function handleReset() {
    setSubscribed(false);
    setFormError(false);
    setEmail("");
    setFirstName("");
    setLastName("");
    setCompany("");
    setRegion(initialRegion);
    setAgree(false);
  }

  // Shared teal-box input skin: translucent white fill, dark text, no default outline.
  const inputClassName =
    "w-full rounded-[6px] border border-transparent bg-white/70 px-4 py-[13px] text-[14.5px] text-foreground outline-none";

  return (
    <section className="mx-auto max-w-containerMaxW px-containerBase pt-[96px]">
      <div className="grid grid-cols-1 items-start gap-16 lg:grid-cols-[1fr_1.05fr]">
        <div>
          <Eyebrow className="mb-[18px]">{eyebrow}</Eyebrow>
          <h2 className="m-0 mb-6 font-display text-[36px] font-semibold leading-[1.12] tracking-[-0.02em] text-foreground">
            {title}
          </h2>
          <div className="flex flex-col gap-4">
            {plans.map((plan) => (
              <PlanCard
                key={plan.value}
                plan={plan}
                selected={selectedPlan === plan.value}
                onSelect={() => setSelectedPlan(plan.value)}
              />
            ))}
          </div>
        </div>

        <div className="rounded-[12px] bg-secondary px-10 pt-10 pb-9">
          {subscribed ? (
            <div className="flex min-h-[420px] flex-col items-start justify-center text-white">
              <div className="mb-5 flex size-[54px] items-center justify-center rounded-full bg-primary text-[26px]">
                ✓
              </div>
              <h3 className="m-0 mb-2.5 font-display text-[26px] font-semibold">{successTitle}</h3>
              <p className="m-0 mb-[22px] max-w-[380px] text-[15px] leading-[1.6] text-white/[0.78]">
                {successBody}
              </p>
              <button
                type="button"
                onClick={handleReset}
                className="rounded-button border border-white/25 bg-white/[0.12] px-5 py-[11px] text-[14px] text-white transition-colors hover:bg-white/20"
              >
                {successCtaLabel}
              </button>
            </div>
          ) : (
            <form noValidate onSubmit={handleSubmit}>
              <div className="mb-[18px] text-[12px] uppercase tracking-[0.1em] text-white/55">
                {detailsLabel}
              </div>
              <div className="mb-[18px] flex flex-col gap-[14px]">
                <input
                  type="email"
                  value={email}
                  onChange={(event) => setEmail(event.target.value)}
                  placeholder={emailPlaceholder}
                  className={inputClassName}
                />
                <div className="grid grid-cols-2 gap-[14px]">
                  <input
                    type="text"
                    value={firstName}
                    onChange={(event) => setFirstName(event.target.value)}
                    placeholder={firstNamePlaceholder}
                    className={inputClassName}
                  />
                  <input
                    type="text"
                    value={lastName}
                    onChange={(event) => setLastName(event.target.value)}
                    placeholder={lastNamePlaceholder}
                    className={inputClassName}
                  />
                </div>
                <input
                  type="text"
                  value={company}
                  onChange={(event) => setCompany(event.target.value)}
                  placeholder={companyPlaceholder}
                  className={inputClassName}
                />
                <select
                  value={region}
                  onChange={(event) => setRegion(event.target.value)}
                  className={cn(inputClassName, "appearance-none")}
                >
                  {regions.map((option) => (
                    <option key={option} value={option}>
                      {option}
                    </option>
                  ))}
                </select>
              </div>
              <label className="mb-[18px] flex cursor-pointer items-start gap-2.5">
                <input
                  type="checkbox"
                  checked={agree}
                  onChange={(event) => setAgree(event.target.checked)}
                  className="sr-only"
                />
                <span
                  className={cn(
                    "mt-0.5 flex size-[18px] shrink-0 items-center justify-center rounded-[4px]",
                    agree ? "bg-primary" : "bg-white"
                  )}
                >
                  {agree ? (
                    <svg
                      width="12"
                      height="12"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="#fff"
                      strokeWidth="3"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      aria-hidden="true"
                    >
                      <path d="M5 13l4 4L19 7" />
                    </svg>
                  ) : null}
                </span>
                <span className="text-[12.5px] leading-[1.5] text-white/[0.78]">{agreeLabel}</span>
              </label>
              {formError ? (
                <div className="mb-[14px] text-[12.5px] text-[#ffb3b3]">{errorMessage}</div>
              ) : null}
              <button
                type="submit"
                className="w-full rounded-[6px] border border-white/70 bg-transparent p-[15px] text-[15px] font-semibold text-white transition-colors hover:border-white hover:bg-white/[0.12]"
              >
                {submitLabel}
              </button>
              <p className="m-0 mt-[14px] text-[11.5px] leading-[1.5] text-white/50">
                {privacyText}{" "}
                <a href={privacyHref} className="text-white/70">
                  {privacyLinkLabel}
                </a>
                .
              </p>
            </form>
          )}
        </div>
      </div>
    </section>
  );
}
