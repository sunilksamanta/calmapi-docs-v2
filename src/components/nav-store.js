'use client';

import { useSyncExternalStore } from 'react';

// Open state of the navigation drawer on phones and tablets, shared by the menu button in the
// header and the sidebar (they are separate client components).

let open = false;
const listeners = new Set();

export function setNavOpen(value) {
  if (open === value) return;
  open = value;
  for (const listener of listeners) listener();
}

const subscribe = (listener) => {
  listeners.add(listener);
  return () => listeners.delete(listener);
};

export const useNavOpen = () => useSyncExternalStore(subscribe, () => open, () => false);
