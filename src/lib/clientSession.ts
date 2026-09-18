"use client";

import type { SessionStatus } from "@/types";

const COUPLE_KEY = "mm_couple_id";

export function pathForStatus(sessionId: string, status: SessionStatus): string {
  switch (status) {
    case "awaiting_b":
    case "generating":
      return `/session/${sessionId}/waiting`;
    case "swiping":
      return `/session/${sessionId}/swipe`;
    case "matched":
    case "completed":
      return `/session/${sessionId}/match`;
    case "final_choice":
      return `/session/${sessionId}/final`;
    default:
      return `/session/${sessionId}/waiting`;
  }
}

export function getCoupleId(): string | null {
  if (typeof window === "undefined") return null;
  return window.localStorage.getItem(COUPLE_KEY);
}

export function setCoupleId(id: string) {
  window.localStorage.setItem(COUPLE_KEY, id);
}

export function getRole(sessionId: string): "a" | "b" | null {
  if (typeof window === "undefined") return null;
  const value = window.localStorage.getItem(`mm_role_${sessionId}`);
  return value === "a" || value === "b" ? value : null;
}

export function setRole(sessionId: string, role: "a" | "b") {
  window.localStorage.setItem(`mm_role_${sessionId}`, role);
}
