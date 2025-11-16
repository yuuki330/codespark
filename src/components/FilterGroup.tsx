import type { PropsWithChildren } from 'react'

type FilterGroupProps = PropsWithChildren<{
  label: string
}>

export function FilterGroup({ label, children }: FilterGroupProps) {
  return (
    <div className='filter-group'>
      <span className='filter-group__label'>{label}</span>
      {children}
    </div>
  )
}
