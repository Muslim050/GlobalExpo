import { createContext, useContext, useMemo, useSyncExternalStore } from 'react'
import * as store from '@/lib/store.js'

const DataCtx = createContext(null)

export function DataProvider({ children }) {
  const state = useSyncExternalStore(
    store.subscribe,
    store.getState,
    store.getState,
  )

  const api = useMemo(
    () => ({
      advertisers: state.advertisers,
      channels: state.channels,
      campaigns: state.campaigns,
      advertiserById: (id) => state.advertisers.find((a) => a.id === id),
      channelById: (id) => state.channels.find((c) => c.id === id),
      campaignById: (id) => state.campaigns.find((c) => c.id === id),
      create: store.create,
      update: store.update,
      remove: store.remove,
      reset: store.resetDb,
    }),
    [state],
  )

  return <DataCtx.Provider value={api}>{children}</DataCtx.Provider>
}

export function useData() {
  const ctx = useContext(DataCtx)
  if (!ctx) throw new Error('useData должен вызываться внутри <DataProvider>')
  return ctx
}
