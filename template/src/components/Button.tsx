import type { AnchorHTMLAttributes, ButtonHTMLAttributes } from 'react'

const variants = {
  primary:
    'block w-full py-3 text-center bg-green-600 hover:bg-green-700 disabled:bg-neutral-200 disabled:text-neutral-400 text-white font-medium rounded-lg transition-colors',
  secondary:
    'block w-full py-3 text-center bg-neutral-100 hover:bg-neutral-200 disabled:text-neutral-400 text-neutral-900 font-medium rounded-lg transition-colors',
  link: 'block w-full py-2 text-center text-neutral-500 hover:text-neutral-900 disabled:text-neutral-300 text-sm transition-colors',
}

type Variant = keyof typeof variants

export function Button({
  variant = 'primary',
  ...props
}: ButtonHTMLAttributes<HTMLButtonElement> & { variant?: Variant }) {
  return <button type="button" className={variants[variant]} {...props} />
}

/** An anchor styled like a Button, for links that open another page. */
export function LinkButton({
  variant = 'primary',
  ...props
}: AnchorHTMLAttributes<HTMLAnchorElement> & { variant?: Variant }) {
  return <a className={variants[variant]} {...props} />
}
