import { createContext, useContext, useEffect, useState } from 'react'
import type { ReactNode } from 'react'
import type { TweakValues } from '../types/cadence'

const STORAGE_KEY = 'cadence_tweaks'

const DEFAULTS: TweakValues = {
  theme: 'warm',
  density: 'default',
  accent: '#6366f1',
  dark: false,
}

function load(): TweakValues {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    return raw ? { ...DEFAULTS, ...JSON.parse(raw) } : DEFAULTS
  } catch {
    return DEFAULTS
  }
}

function apply(t: TweakValues) {
  const root = document.documentElement
  root.setAttribute('data-theme', t.theme)
  root.setAttribute('data-density', t.density)
  if (t.dark) root.setAttribute('data-mode', 'dark')
  else root.removeAttribute('data-mode')
  root.style.setProperty('--accent', t.accent)
}

interface TweaksContextValue {
  tweaks: TweakValues
  set: (patch: Partial<TweakValues>) => void
}

const TweaksContext = createContext<TweaksContextValue | null>(null)

export function TweaksProvider({ children }: { children: ReactNode }) {
  const [tweaks, setTweaks] = useState<TweakValues>(load)

  useEffect(() => {
    apply(tweaks)
    localStorage.setItem(STORAGE_KEY, JSON.stringify(tweaks))
  }, [tweaks])

  function set(patch: Partial<TweakValues>) {
    setTweaks(prev => ({ ...prev, ...patch }))
  }

  return <TweaksContext.Provider value={{ tweaks, set }}>{children}</TweaksContext.Provider>
}

export function useTweaks() {
  const ctx = useContext(TweaksContext)
  if (!ctx) throw new Error('useTweaks must be inside TweaksProvider')
  return ctx
}
