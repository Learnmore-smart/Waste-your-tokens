import { useEffect, useMemo, useState } from 'react'

type Serializer<T> = {
  parse: (raw: string) => T
  stringify: (value: T) => string
}

const jsonSerializer: Serializer<unknown> = {
  parse: (raw) => JSON.parse(raw) as unknown,
  stringify: (value) => JSON.stringify(value),
}

export function useLocalStorageState<T>(
  key: string,
  initialValue: T | (() => T),
  serializer: Serializer<T> = jsonSerializer as Serializer<T>,
) {
  const initial = useMemo(() => {
    const fallback = typeof initialValue === 'function' ? (initialValue as () => T)() : initialValue
    if (typeof window === 'undefined') return fallback
    try {
      const raw = window.localStorage.getItem(key)
      if (raw == null) return fallback
      return serializer.parse(raw)
    } catch {
      return fallback
    }
  }, [initialValue, key, serializer])

  const [state, setState] = useState<T>(initial)

  useEffect(() => {
    try {
      window.localStorage.setItem(key, serializer.stringify(state))
    } catch {}
  }, [key, serializer, state])

  return [state, setState] as const
}

