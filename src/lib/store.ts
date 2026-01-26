"use client"

import { enableMapSet } from "immer"
import { create } from "zustand"
import { persist } from "zustand/middleware"
import { immer } from "zustand/middleware/immer"
import type { ObjectiveWithProgress as Obj, OrgInvite, OrgMember } from "@/lib/types"

enableMapSet()

type V = "objective" | "report" | "settings" | "help" | "history" | null

interface S {
  objs: Obj[]
  members: OrgMember[]
  invites: OrgInvite[]
  view: V
  editing: Obj | null
  idx: number
  hover: string | null
  open: Set<string>
  menu: string | null
  tab: "members" | "invites"
  range: "1M" | "Q" | "Y"
  theme: "light" | "dark" | "system"
}

const use = create<S & A>()(
  persist(
    immer((set, get) => ({
      objs: [],
      members: [],
      invites: [],
      view: null,
      editing: null,
      idx: -1,
      hover: null,
      open: new Set(),
      menu: null,
      tab: "members",
      range: "Q",
      theme: "system",

      set: (k, v) => set({ [k]: v } as any),
      show: (v, o) => set({ view: v, editing: o ?? null }),
      hide: () => set({ view: null, editing: null, menu: null }),
      flip: (id) =>
        set((s) => {
          s.open.has(id) ? s.open.delete(id) : s.open.add(id)
        }),
      nav: (d) =>
        set((s) => {
          const n = s.objs.length
          if (n) {
            s.idx = (s.idx + d + n) % n
            s.hover = s.objs[s.idx]?.id ?? null
          }
        }),
      go: (n) =>
        set((s) => {
          if (n > 0 && n <= s.objs.length) {
            s.idx = n - 1
            s.hover = s.objs[s.idx].id
          }
        }),
      dark: () => {
        const t = get().theme,
          n = t === "light" ? "dark" : t === "dark" ? "system" : "light"
        set({ theme: n })
        document.documentElement.classList.toggle(
          "dark",
          n === "dark" || (n === "system" && matchMedia("(prefers-color-scheme: dark)").matches)
        )
      },
    })),
    {
      name: "okr",
      partialize: (s) => ({ theme: s.theme, range: s.range, tab: s.tab, open: [...s.open] }),
      onRehydrateStorage: () => (s) => {
        if (s?.open && Array.isArray(s.open)) s.open = new Set(s.open)
      },
    }
  )
)

interface A {
  set<K extends keyof S>(k: K, v: S[K]): void
  show(v: V, o?: Obj): void
  hide(): void
  flip(id: string): void
  nav(d: 1 | -1): void
  go(n: number): void
  dark(): void
}

export const useStore = use
export const $ = use.getState()
