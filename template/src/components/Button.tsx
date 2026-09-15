import type {
  AnchorHTMLAttributes,
  ButtonHTMLAttributes,
  ReactNode,
} from 'react'

const variants = {
  primary:
    'bg-green-600 hover:bg-green-700 disabled:bg-neutral-200 disabled:text-neutral-400 text-white font-medium',
  secondary:
    'bg-neutral-100 hover:bg-neutral-200 disabled:text-neutral-400 text-neutral-900 font-medium',
  danger: 'text-red-600 hover:bg-red-50 disabled:text-neutral-400 font-medium',
  link: 'text-neutral-500 hover:text-neutral-900 disabled:text-neutral-300 text-sm',
}

const sizes = {
  full: 'block w-full py-3 text-center',
  sm: 'px-3 py-1.5 text-sm',
}

type ButtonStyle = {
  variant?: keyof typeof variants | undefined
  size?: keyof typeof sizes | undefined
}

function buttonClasses({ variant = 'primary', size = 'full' }: ButtonStyle) {
  return `${variants[variant]} ${sizes[size]} rounded-lg transition-colors`
}

export function Button({
  variant,
  size,
  ...props
}: ButtonHTMLAttributes<HTMLButtonElement> & ButtonStyle) {
  return (
    <button
      type="button"
      className={buttonClasses({ variant, size })}
      {...props}
    />
  )
}

/** An anchor styled like a Button, for links that open another page. */
export function LinkButton({
  variant,
  size,
  ...props
}: AnchorHTMLAttributes<HTMLAnchorElement> & ButtonStyle) {
  return <a className={buttonClasses({ variant, size })} {...props} />
}

/** A square button showing only an icon. `label` is its tooltip and name. */
export function IconButton({
  label,
  children,
  ...props
}: ButtonHTMLAttributes<HTMLButtonElement> & {
  label: string
  children: ReactNode
}) {
  return (
    <button
      type="button"
      title={label}
      aria-label={label}
      className="grid size-8 place-items-center rounded-lg text-neutral-500 transition-colors hover:bg-neutral-100 hover:text-neutral-900 disabled:pointer-events-none disabled:opacity-40 aria-expanded:bg-neutral-100 aria-expanded:text-neutral-900"
      {...props}
    >
      {children}
    </button>
  )
}
