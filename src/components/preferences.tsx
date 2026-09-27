'use client'

import Link from 'next/link'
import {
  createContext,
  useContext,
  useSyncExternalStore,
  type ReactNode,
} from 'react'

type Preferences = {
  decided: boolean
  marketing: boolean
  compare: string[]
  saved: string[]
}
const initial: Preferences = {
  decided: false,
  marketing: false,
  compare: [],
  saved: [],
}
let current = initial
let loaded = false
const listeners = new Set<() => void>()
const key = 'affiliate-preferences-v1'
function read() {
  try {
    const raw = JSON.parse(localStorage.getItem(key) || 'null')
    if (
      raw &&
      typeof raw.decided === 'boolean' &&
      typeof raw.marketing === 'boolean'
    ) {
      const ids = (v: unknown) =>
        Array.isArray(v)
          ? v.filter((id): id is string => typeof id === 'string').slice(0, 100)
          : []
      current = {
        decided: raw.decided,
        marketing: raw.marketing,
        compare: ids(raw.compare).slice(0, 4),
        saved: ids(raw.saved),
      }
    }
  } catch {
    /* Preferences still work in memory when storage is blocked. */
  }
}
function subscribe(listener: () => void) {
  listeners.add(listener)
  if (!loaded) {
    loaded = true
    read()
  }
  const onStorage = () => {
    current = initial
    read()
    listeners.forEach((fn) => fn())
  }
  window.addEventListener('storage', onStorage)
  return () => {
    listeners.delete(listener)
    window.removeEventListener('storage', onStorage)
  }
}
function update(patch: Partial<Preferences>) {
  current = { ...current, ...patch }
  try {
    localStorage.setItem(key, JSON.stringify(current))
  } catch {
    /* Session-only fallback. */
  }
  listeners.forEach((fn) => fn())
}
const PreferencesContext = createContext({ state: initial, update })
export function PreferencesProvider({ children }: { children: ReactNode }) {
  const state = useSyncExternalStore(
    subscribe,
    () => current,
    () => initial,
  )
  return (
    <PreferencesContext.Provider value={{ state, update }}>
      {children}
    </PreferencesContext.Provider>
  )
}
export const usePreferences = () => useContext(PreferencesContext)

export function ConsentSettings() {
  const { state, update } = usePreferences()
  if (state.decided) return null
  return (
    <section className="consent-panel" aria-label="Valg om reklamelinks">
      <div>
        <strong>Du bestemmer over dine data</strong>
        <p>
          Vi bruger lokal lagring til dine valg. Tillad affiliate-sporing, hvis
          du vil støtte os, når du handler. Uden tilladelse bruger vi direkte
          butikslinks. <Link href="/privatliv">Læs om privatliv</Link>.
        </p>
      </div>
      <div className="consent-actions">
        <button
          className="button button-secondary"
          onClick={() => update({ decided: true, marketing: false })}
        >
          Kun nødvendige
        </button>
        <button
          className="button"
          onClick={() => update({ decided: true, marketing: true })}
        >
          Tillad affiliate-sporing
        </button>
      </div>
    </section>
  )
}

export function PreferenceButton() {
  const { update } = usePreferences()
  return (
    <button
      className="text-button"
      onClick={() => update({ decided: false, marketing: false })}
    >
      Privatlivsindstillinger
    </button>
  )
}
