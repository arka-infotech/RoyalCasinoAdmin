"use client";

type Listener = () => void;

let revision = 0;
const listeners = new Set<Listener>();

export function bumpPresenceRevision() {
  revision += 1;
  listeners.forEach((listener) => listener());
}

export function getPresenceRevision() {
  return revision;
}

export function subscribePresenceRevision(listener: Listener) {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}
