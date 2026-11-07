"use client";

import { useEffect, useRef, useState } from "react";
import { useDialogA11y } from "./sheet";
import { useI18n } from "./providers";

const SLIDES = ["welcome", "gifts", "deed", "live", "dignity"] as const;

export function IntroTour() {
  const { messages: m } = useI18n();
  const [open, setOpen] = useState(false);
  const [step, setStep] = useState(0);
  const [touchX, setTouchX] = useState<number | null>(null);
  const dialogRef = useRef<HTMLDivElement>(null);
  useDialogA11y(dialogRef, close, open);

  useEffect(() => {
    const seen = document.cookie.split(";").some((part) => part.trim().startsWith("introSeen=1"));
    const forced = new URLSearchParams(window.location.search).get("intro") === "1";
    if (forced || !seen) setOpen(true);
    const reopen = () => {
      setStep(0);
      setOpen(true);
    };
    window.addEventListener("hojnost-intro", reopen);
    return () => window.removeEventListener("hojnost-intro", reopen);
  }, []);

  function close() {
    document.cookie = "introSeen=1;path=/;max-age=31536000;samesite=lax";
    setOpen(false);
    if (new URLSearchParams(window.location.search).get("intro") === "1") {
      window.history.replaceState(null, "", window.location.pathname);
    }
  }

  if (!open) return null;
  const slides = [
    { title: m.tour.welcomeTitle, body: m.tour.welcomeBody },
    { title: m.tour.giftsTitle, body: m.tour.giftsBody },
    { title: m.tour.deedTitle, body: m.tour.deedBody },
    { title: m.tour.liveTitle, body: m.tour.liveBody },
    { title: m.tour.dignityTitle, body: m.tour.dignityBody },
  ];
  const title = slides[step]?.title ?? m.tour.welcomeTitle;
  const body = slides[step]?.body ?? m.tour.welcomeBody;

  return (
    <div ref={dialogRef} className="sheet-back tour-back" role="dialog" aria-modal="true" aria-label={title}>
      <div
        className="sheet tour-sheet"
        onTouchStart={(event) => setTouchX(event.changedTouches[0]?.clientX ?? null)}
        onTouchEnd={(event) => {
          if (touchX == null) return;
          const delta = (event.changedTouches[0]?.clientX ?? touchX) - touchX;
          if (delta < -40 && step < SLIDES.length - 1) setStep((value) => value + 1);
          if (delta > 40 && step > 0) setStep((value) => value - 1);
          setTouchX(null);
        }}
      >
        <p className="kicker">
          {step + 1} / {SLIDES.length}
        </p>
        <h2>{title}</h2>
        <p className="lede">{body}</p>
        <div className="tour-dots" aria-hidden="true">
          {SLIDES.map((slide, index) => (
            <span key={slide} className={index === step ? "on" : ""} />
          ))}
        </div>
        <div className="row">
          <button type="button" className="btn-ghost" onClick={close}>
            {m.tour.skip}
          </button>
          {step > 0 ? (
            <button type="button" className="btn-ghost" onClick={() => setStep((value) => value - 1)}>
              {m.tour.back}
            </button>
          ) : null}
          {step < SLIDES.length - 1 ? (
            <button type="button" className="btn-primary" style={{ width: "auto" }} onClick={() => setStep((value) => value + 1)}>
              {m.tour.next}
            </button>
          ) : (
            <button type="button" className="btn-primary" style={{ width: "auto" }} onClick={close}>
              {m.tour.done}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

export function ReopenIntroButton() {
  const { messages } = useI18n();
  return (
    <button type="button" className="btn-ghost" onClick={() => window.dispatchEvent(new Event("hojnost-intro"))}>
      {messages.tour.reopen}
    </button>
  );
}
