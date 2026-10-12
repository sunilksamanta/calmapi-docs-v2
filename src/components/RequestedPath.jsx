'use client';

import { useSyncExternalStore } from 'react';

const noSubscription = () => () => {};

/** The path the visitor asked for. The 404 page is prerendered once, so it is only known in the browser. */
function RequestedPath() {
  const path = useSyncExternalStore(noSubscription, () => window.location.pathname, () => null);
  return path ? <code>{path}</code> : 'this address';
}

export default RequestedPath;
