import { svgProps, type IconProps } from './_base';

/* All SVG paths below are hand-authored from generic geometric primitives
 * (rectangles, circles, polylines). They are intentionally simple so the set
 * stays small and dependency-free. Each icon renders inside a 24x24 box. */

export function LayoutDashboardIcon(p: IconProps) {
  return (
    <svg {...svgProps(p)}>
      <rect x="3"  y="3"  width="7"  height="9"  rx="1" />
      <rect x="14" y="3"  width="7"  height="5"  rx="1" />
      <rect x="14" y="12" width="7"  height="9"  rx="1" />
      <rect x="3"  y="16" width="7"  height="5"  rx="1" />
    </svg>
  );
}

export function CalendarIcon(p: IconProps) {
  return (
    <svg {...svgProps(p)}>
      <rect x="3" y="5" width="18" height="16" rx="2" />
      <path d="M16 3v4M8 3v4M3 10h18" />
    </svg>
  );
}

export function FolderKanbanIcon(p: IconProps) {
  return (
    <svg {...svgProps(p)}>
      <path d="M4 4h5l2 3h9a1 1 0 0 1 1 1v11a1 1 0 0 1-1 1H4a1 1 0 0 1-1-1V5a1 1 0 0 1 1-1Z" />
      <path d="M9 11v5M13 11v3M17 11v6" />
    </svg>
  );
}

export function ReceiptIcon(p: IconProps) {
  return (
    <svg {...svgProps(p)}>
      <path d="M5 3v18l2-1.5L9 21l2-1.5L13 21l2-1.5L17 21l2-1.5V3" />
      <path d="M8 8h8M8 12h8M8 16h5" />
    </svg>
  );
}

export function FileTextIcon(p: IconProps) {
  return (
    <svg {...svgProps(p)}>
      <path d="M14 3H6a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V9Z" />
      <path d="M14 3v6h6" />
      <path d="M8 13h8M8 17h6" />
    </svg>
  );
}

export function LogOutIcon(p: IconProps) {
  return (
    <svg {...svgProps(p)}>
      <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
      <path d="M16 17l5-5-5-5" />
      <path d="M21 12H9" />
    </svg>
  );
}

export function ArrowLeftIcon(p: IconProps) {
  return (
    <svg {...svgProps(p)}>
      <path d="M19 12H5" />
      <path d="M12 19l-7-7 7-7" />
    </svg>
  );
}

export function ServerIcon(p: IconProps) {
  return (
    <svg {...svgProps(p)}>
      <rect x="3" y="3"  width="18" height="8" rx="2" />
      <rect x="3" y="13" width="18" height="8" rx="2" />
      <path d="M7 7h.01M7 17h.01" />
    </svg>
  );
}

export function LineChartIcon(p: IconProps) {
  return (
    <svg {...svgProps(p)}>
      <path d="M3 3v18h18" />
      <path d="M7 15l4-4 3 3 5-6" />
    </svg>
  );
}

export function BotIcon(p: IconProps) {
  return (
    <svg {...svgProps(p)}>
      <rect x="4" y="7" width="16" height="12" rx="2" />
      <path d="M12 3v4" />
      <circle cx="9"  cy="13" r="1" />
      <circle cx="15" cy="13" r="1" />
      <path d="M9 17h6" />
    </svg>
  );
}

export function SearchIcon(p: IconProps) {
  return (
    <svg {...svgProps(p)}>
      <circle cx="11" cy="11" r="7" />
      <path d="M21 21l-4.3-4.3" />
    </svg>
  );
}

export function RefreshCwIcon(p: IconProps) {
  return (
    <svg {...svgProps(p)}>
      <path d="M21 12a9 9 0 1 1-3-6.7L21 8" />
      <path d="M21 3v5h-5" />
    </svg>
  );
}

export function SendIcon(p: IconProps) {
  return (
    <svg {...svgProps(p)}>
      <path d="M22 2 11 13" />
      <path d="M22 2 15 22l-4-9-9-4Z" />
    </svg>
  );
}

export function PlusIcon(p: IconProps) {
  return (
    <svg {...svgProps(p)}>
      <path d="M12 5v14M5 12h14" />
    </svg>
  );
}

export function ArchiveIcon(p: IconProps) {
  return (
    <svg {...svgProps(p)}>
      <rect x="3" y="3" width="18" height="5" rx="1" />
      <path d="M5 8v11a1 1 0 0 0 1 1h12a1 1 0 0 0 1-1V8" />
      <path d="M10 12h4" />
    </svg>
  );
}

export function Trash2Icon(p: IconProps) {
  return (
    <svg {...svgProps(p)}>
      <path d="M3 6h18" />
      <path d="M8 6V4a1 1 0 0 1 1-1h6a1 1 0 0 1 1 1v2" />
      <path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6" />
      <path d="M10 11v6M14 11v6" />
    </svg>
  );
}

export function CheckCircle2Icon(p: IconProps) {
  return (
    <svg {...svgProps(p)}>
      <circle cx="12" cy="12" r="9" />
      <path d="M8 12l3 3 5-6" />
    </svg>
  );
}

export function XCircleIcon(p: IconProps) {
  return (
    <svg {...svgProps(p)}>
      <circle cx="12" cy="12" r="9" />
      <path d="M9 9l6 6M15 9l-6 6" />
    </svg>
  );
}

export function MenuIcon(p: IconProps) {
  return (
    <svg {...svgProps(p)}>
      <path d="M4 6h16M4 12h16M4 18h16" />
    </svg>
  );
}

export function XIcon(p: IconProps) {
  return (
    <svg {...svgProps(p)}>
      <path d="M18 6 6 18M6 6l12 12" />
    </svg>
  );
}

export function UserIcon(p: IconProps) {
  return (
    <svg {...svgProps(p)}>
      <circle cx="12" cy="8" r="4" />
      <path d="M4 21a8 8 0 0 1 16 0" />
    </svg>
  );
}

export function GlobeIcon(p: IconProps) {
  return (
    <svg {...svgProps(p)}>
      <circle cx="12" cy="12" r="9" />
      <path d="M3 12h18" />
      <path d="M12 3a14 14 0 0 1 0 18M12 3a14 14 0 0 0 0 18" />
    </svg>
  );
}
