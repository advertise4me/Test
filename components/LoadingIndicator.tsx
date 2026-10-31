import { useEffect, useState } from "react";

const WAITING_MESSAGES = [
  "Robots are doing the heavy lifting for you...",
  "Crunching your campaign numbers...",
  "Digging through your ad data...",
  "Teaching the robots marketing...",
  "Lining up your metrics...",
  "Consulting the algorithm...",
  "Sharpening the charts...",
  "Herding pixels into place...",
  "Double-checking the math...",
  "Almost there...",
];

const ROTATE_INTERVAL_MS = 2250;

/**
 * General-purpose "waiting on a response" indicator with a rotating set of
 * playful status lines. Pass `label` to override with a specific, more
 * informative message (e.g. while a Meta API tool call is running) instead
 * of the rotating messages.
 */
export default function LoadingIndicator({ label }: { label?: string }) {
  const [index, setIndex] = useState(() => Math.floor(Math.random() * WAITING_MESSAGES.length));

  useEffect(() => {
    if (label) return;
    const id = setInterval(() => {
      setIndex((prev) => (prev + 1) % WAITING_MESSAGES.length);
    }, ROTATE_INTERVAL_MS);
    return () => clearInterval(id);
  }, [label]);

  return (
    <span className="animate-pulse-fade inline-flex items-center gap-1">
      {label ?? WAITING_MESSAGES[index]}
    </span>
  );
}
