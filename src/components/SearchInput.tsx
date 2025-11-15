import { forwardRef, useEffect, useImperativeHandle, useRef } from 'react'

type SearchInputProps = {
  value: string
  placeholder?: string
  onChange: (value: string) => void
}

export type SearchInputHandle = {
  focus: () => void
}

export const SearchInput = forwardRef<SearchInputHandle, SearchInputProps>(
  ({ value, placeholder = 'Search snippets…', onChange }, ref) => {
    const inputRef = useRef<HTMLInputElement | null>(null)

    useImperativeHandle(ref, () => ({
      focus: () => inputRef.current?.focus(),
    }))

    useEffect(() => {
      inputRef.current?.focus()
    }, [])

    return (
      <div className='search-bar'>
        <input
          ref={inputRef}
          autoComplete='off'
          spellCheck={false}
          className='search-bar__input'
          placeholder={placeholder}
          type='text'
          value={value}
          onChange={event => onChange(event.target.value)}
          aria-label='スニペット検索入力'
        />
      </div>
    )
  }
)

SearchInput.displayName = 'SearchInput'
