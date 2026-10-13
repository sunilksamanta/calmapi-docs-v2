import {
  Home, Rocket, FolderTree, Database, ShieldCheck, Settings, Route, Filter, KeyRound, TriangleAlert, SlidersHorizontal,
  Gauge, FlaskConical, Terminal, Bot, RefreshCw, Blocks, BookOpen, ClipboardList, Clock, Send, Mail, Plug, Timer, Radio,
  ArchiveRestore, HardDrive, CloudUpload, PackagePlus, Cloud, Shield, ShieldAlert, ArrowRightLeft, Zap, Layers, Package,
  Gamepad2, FileText, Puzzle, Lightbulb, ScanSearch, Smartphone, Bell, BellRing, Key, ToggleRight, Repeat, WandSparkles, Inbox,
  UserX, Webhook, Hammer, GitCompare, Lock, FileSearch, Eye, History, UserCog,
} from 'lucide-react';

// The lucide icons that manifest entries may name in `icon` (used on the home page cards).
export const ICONS = {
  Home, Rocket, FolderTree, Database, ShieldCheck, Settings, Route, Filter, KeyRound, TriangleAlert, SlidersHorizontal,
  Gauge, FlaskConical, Terminal, Bot, RefreshCw, Blocks, BookOpen, ClipboardList, Clock, Send, Mail, Plug, Timer, Radio,
  ArchiveRestore, HardDrive, CloudUpload, PackagePlus, Cloud, Shield, ShieldAlert, ArrowRightLeft, Zap, Layers, Package,
  Gamepad2, FileText, Puzzle, Lightbulb, ScanSearch, Smartphone, Bell, BellRing, Key, ToggleRight, Repeat, WandSparkles, Inbox,
  UserX, Webhook, Hammer, GitCompare, Lock, FileSearch, Eye, History, UserCog,
};

export function PageIcon({ name, ...props }) {
  const Icon = ICONS[name] ?? FileText;
  return <Icon strokeWidth={1.7} aria-hidden="true" {...props} />;
}

/** The GitHub mark, as drawn on the CalmAPI website. */
export function GithubMark(props) {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true" fill="currentColor" {...props}>
      <path d="M12 2a10 10 0 0 0-3.16 19.49c.5.09.68-.22.68-.48v-1.7c-2.78.6-3.37-1.34-3.37-1.34-.45-1.16-1.11-1.47-1.11-1.47-.9-.62.07-.6.07-.6 1 .07 1.53 1.03 1.53 1.03.9 1.52 2.34 1.08 2.91.83.09-.65.35-1.08.63-1.33-2.22-.25-4.55-1.11-4.55-4.94 0-1.09.39-1.98 1.03-2.68-.1-.25-.45-1.27.1-2.64 0 0 .84-.27 2.75 1.02a9.5 9.5 0 0 1 5 0c1.91-1.29 2.75-1.02 2.75-1.02.55 1.37.2 2.39.1 2.64.64.7 1.03 1.59 1.03 2.68 0 3.84-2.34 4.68-4.57 4.93.36.31.68.92.68 1.85v2.74c0 .27.18.58.69.48A10 10 0 0 0 12 2Z" />
    </svg>
  );
}
