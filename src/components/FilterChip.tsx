import type { ButtonHTMLAttributes, PropsWithChildren } from 'react'

type FilterChipProps = PropsWithChildren<
  ButtonHTMLAttributes<HTMLButtonElement> & {
    active?: boolean
  }
>

export function FilterChip({ active = false, children, className = '', ...rest }: FilterChipProps) {
  const composedClassName = ['filter-chip', active ? 'is-active' : '', className]
    .filter(Boolean)
    .join(' ')

  return (
    <button type='button' className={composedClassName} {...rest}>
      {children}
    </button>
  )
}
