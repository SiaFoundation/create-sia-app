import { useToastStore } from '../stores/toast'
import { IconButton } from './Button'
import { CopyIcon } from './icons'

export function CopyButton({ value, label }: { value: string; label: string }) {
  const addToast = useToastStore((s) => s.addToast)

  return (
    <IconButton
      label="Copy"
      onClick={() => {
        navigator.clipboard.writeText(value)
        addToast(label)
      }}
    >
      <CopyIcon />
    </IconButton>
  )
}
