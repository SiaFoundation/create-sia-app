import type { ReactNode } from 'react'

function Icon({ children }: { children: ReactNode }) {
  return (
    <svg
      className="size-4"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.75"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      {children}
    </svg>
  )
}

export function DownloadIcon() {
  return (
    <Icon>
      <path d="M12 4v11m0 0l-4-4m4 4l4-4M5 19h14" />
    </Icon>
  )
}

export function UploadIcon() {
  return (
    <Icon>
      <path d="M12 16V5m0 0l-4 4m4-4l4 4M5 19h14" />
    </Icon>
  )
}

export function LinkIcon() {
  return (
    <Icon>
      <path d="M10 14a4 4 0 005.66 0l3-3a4 4 0 00-5.66-5.66l-1 1" />
      <path d="M14 10a4 4 0 00-5.66 0l-3 3a4 4 0 005.66 5.66l1-1" />
    </Icon>
  )
}

export function FileIcon() {
  return (
    <Icon>
      <path d="M14 3H7a2 2 0 00-2 2v14a2 2 0 002 2h10a2 2 0 002-2V8z" />
      <path d="M14 3v5h5" />
    </Icon>
  )
}

export function CopyIcon() {
  return (
    <Icon>
      <rect x="9" y="9" width="12" height="12" rx="2" />
      <path d="M5 15H4a1 1 0 01-1-1V4a1 1 0 011-1h10a1 1 0 011 1v1" />
    </Icon>
  )
}

export function CloseIcon() {
  return (
    <Icon>
      <path d="M6 6l12 12M18 6L6 18" />
    </Icon>
  )
}

export function ChevronRightIcon() {
  return (
    <Icon>
      <path d="M9 6l6 6-6 6" />
    </Icon>
  )
}

export function ArrowLeftIcon() {
  return (
    <Icon>
      <path d="M19 12H5m0 0l6-6m-6 6l6 6" />
    </Icon>
  )
}

export function Spinner() {
  return (
    <span className="block size-4 rounded-full border-2 border-neutral-300 border-t-green-600 animate-spin" />
  )
}
