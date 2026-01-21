"use client"

import { create } from "zustand"
import { persist, createJSONStorage } from "zustand/middleware"
import type { User } from "@supabase/supabase-js"
import type { Objective, ObjectiveWithProgress, Organization, OrgMember, OrgInvite, KeyResult } from "@/lib/types"

// Key Result form state
interface KeyResultForm {
  id: string
  title: string
  targetValue: number
  startValue: number
  unit: string
}

// Objective form state
interface ObjectiveForm {
  title: string
  description: string
  endDate: string
  keyResults: KeyResultForm[]
}

// Report form state
interface ReportForm {
  values: Record<string, number>
  note: string
}

// Invite form state
interface InviteForm {
  email: string
  role: "admin" | "member"
}

// All app state
interface AppState {
  // Auth
  user: User | null
  org: Organization | null
  orgRole: "owner" | "admin" | "member" | null
  devMode: boolean

  // Data
  objectives: ObjectiveWithProgress[]
  orgMembers: OrgMember[]
  orgInvites: OrgInvite[]

  // UI - Modals
  showObjectiveModal: boolean
  showReportModal: boolean
  showOrgSettings: boolean
  showHelp: boolean
  showHistoryModal: boolean
  editingObjective: Objective | null
  reportingObjective: Objective | null
  historyObjective: Objective | null

  // UI - Selection
  selectedIdx: number
  hoveredObjId: string | null
  expandedIds: Set<string>
  menuOpenId: string | null

  // UI - Chart
  chartPeriod: "1M" | "Q" | "Y"

  // UI - Theme
  theme: "light" | "dark" | "system"

  // UI - Org Settings Tab
  orgSettingsTab: "members" | "invites"

  // Forms - Objective Modal
  objectiveForm: ObjectiveForm

  // Forms - Report Modal
  reportForm: ReportForm

  // Forms - Invite
  inviteForm: InviteForm

  // Forms - Login
  loginEmail: string
  loginOtp: string[]
  loginStep: "email" | "otp"

  // Forms - Create Org
  createOrgName: string

  // Loading states
  loading: {
    objectives: boolean
    submit: boolean
    ai: boolean
    invite: boolean
    member: boolean
  }

  // Error/Success messages
  error: string
  success: string

  // Actions - Auth
  setUser: (user: User | null) => void
  setOrg: (org: Organization | null) => void
  setOrgRole: (role: "owner" | "admin" | "member" | null) => void
  setDevMode: (devMode: boolean) => void

  // Actions - Data
  setObjectives: (objectives: ObjectiveWithProgress[]) => void
  addObjective: (objective: ObjectiveWithProgress) => void
  updateObjective: (id: string, updates: Partial<ObjectiveWithProgress>) => void
  deleteObjective: (id: string) => void
  setOrgMembers: (members: OrgMember[]) => void
  setOrgInvites: (invites: OrgInvite[]) => void

  // Actions - Modals
  openObjectiveModal: (editing?: Objective | null) => void
  closeObjectiveModal: () => void
  openReportModal: (objective: Objective) => void
  closeReportModal: () => void
  openOrgSettings: () => void
  closeOrgSettings: () => void
  openHelp: () => void
  closeHelp: () => void
  openHistoryModal: (objective: Objective) => void
  closeHistoryModal: () => void
  closeAllModals: () => void

  // Actions - Selection
  setSelectedIdx: (idx: number) => void
  setHoveredObjId: (id: string | null) => void
  toggleExpanded: (id: string) => void
  setMenuOpenId: (id: string | null) => void
  selectNext: () => void
  selectPrev: () => void
  selectByNumber: (num: number) => void

  // Actions - Chart
  setChartPeriod: (period: "1M" | "Q" | "Y") => void

  // Actions - Theme
  setTheme: (theme: "light" | "dark" | "system") => void
  cycleTheme: () => void

  // Actions - Org Settings
  setOrgSettingsTab: (tab: "members" | "invites") => void

  // Actions - Objective Form
  setObjectiveFormField: <K extends keyof ObjectiveForm>(field: K, value: ObjectiveForm[K]) => void
  addKeyResult: () => void
  updateKeyResult: (id: string, field: keyof KeyResultForm, value: string | number) => void
  removeKeyResult: (id: string) => void
  setKeyResults: (keyResults: KeyResultForm[]) => void
  resetObjectiveForm: () => void
  populateObjectiveForm: (objective: Objective) => void

  // Actions - Report Form
  setReportValue: (krId: string, value: number) => void
  setReportNote: (note: string) => void
  resetReportForm: () => void
  populateReportForm: (objective: Objective) => void

  // Actions - Invite Form
  setInviteEmail: (email: string) => void
  setInviteRole: (role: "admin" | "member") => void
  resetInviteForm: () => void

  // Actions - Login Form
  setLoginEmail: (email: string) => void
  setLoginOtp: (otp: string[]) => void
  setLoginOtpDigit: (index: number, digit: string) => void
  setLoginStep: (step: "email" | "otp") => void
  resetLoginForm: () => void

  // Actions - Create Org
  setCreateOrgName: (name: string) => void
  resetCreateOrgForm: () => void

  // Actions - Loading
  setLoading: (key: keyof AppState["loading"], value: boolean) => void

  // Actions - Messages
  setError: (error: string) => void
  setSuccess: (success: string) => void
  clearMessages: () => void
}

const defaultObjectiveForm: ObjectiveForm = {
  title: "",
  description: "",
  endDate: new Date(Date.now() + 90 * 24 * 60 * 60 * 1000).toISOString().split("T")[0],
  keyResults: [],
}

const defaultReportForm: ReportForm = {
  values: {},
  note: "",
}

const defaultInviteForm: InviteForm = {
  email: "",
  role: "member",
}

export const useAppStore = create<AppState>()(
  persist(
    (set, get) => ({
      // Initial State - Auth
      user: null,
      org: null,
      orgRole: null,
      devMode: false,

      // Initial State - Data
      objectives: [],
      orgMembers: [],
      orgInvites: [],

      // Initial State - Modals
      showObjectiveModal: false,
      showReportModal: false,
      showOrgSettings: false,
      showHelp: false,
      showHistoryModal: false,
      editingObjective: null,
      reportingObjective: null,
      historyObjective: null,

      // Initial State - Selection
      selectedIdx: -1,
      hoveredObjId: null,
      expandedIds: new Set(),
      menuOpenId: null,

      // Initial State - Chart
      chartPeriod: "Q",

      // Initial State - Theme
      theme: "system",

      // Initial State - Org Settings
      orgSettingsTab: "members",

      // Initial State - Forms
      objectiveForm: { ...defaultObjectiveForm },
      reportForm: { ...defaultReportForm },
      inviteForm: { ...defaultInviteForm },
      loginEmail: "",
      loginOtp: ["", "", "", "", "", ""],
      loginStep: "email",
      createOrgName: "",

      // Initial State - Loading
      loading: {
        objectives: false,
        submit: false,
        ai: false,
        invite: false,
        member: false,
      },

      // Initial State - Messages
      error: "",
      success: "",

      // Actions - Auth
      setUser: (user) => set({ user }),
      setOrg: (org) => set({ org }),
      setOrgRole: (orgRole) => set({ orgRole }),
      setDevMode: (devMode) => set({ devMode }),

      // Actions - Data
      setObjectives: (objectives) => set({ objectives }),
      addObjective: (objective) => set((s) => ({ objectives: [objective, ...s.objectives] })),
      updateObjective: (id, updates) => set((s) => ({
        objectives: s.objectives.map((o) => (o.id === id ? { ...o, ...updates } : o)),
      })),
      deleteObjective: (id) => set((s) => ({
        objectives: s.objectives.filter((o) => o.id !== id),
        selectedIdx: s.selectedIdx >= s.objectives.length - 1 ? Math.max(0, s.objectives.length - 2) : s.selectedIdx,
      })),
      setOrgMembers: (orgMembers) => set({ orgMembers }),
      setOrgInvites: (orgInvites) => set({ orgInvites }),

      // Actions - Modals
      openObjectiveModal: (editing = null) => {
        if (editing) {
          get().populateObjectiveForm(editing)
        } else {
          get().resetObjectiveForm()
        }
        set({ showObjectiveModal: true, editingObjective: editing })
      },
      closeObjectiveModal: () => set({ showObjectiveModal: false, editingObjective: null }),
      openReportModal: (objective) => {
        get().populateReportForm(objective)
        set({ showReportModal: true, reportingObjective: objective })
      },
      closeReportModal: () => set({ showReportModal: false, reportingObjective: null }),
      openOrgSettings: () => set({ showOrgSettings: true }),
      closeOrgSettings: () => set({ showOrgSettings: false }),
      openHelp: () => set({ showHelp: true }),
      closeHelp: () => set({ showHelp: false }),
      openHistoryModal: (objective) => set({ showHistoryModal: true, historyObjective: objective }),
      closeHistoryModal: () => set({ showHistoryModal: false, historyObjective: null }),
      closeAllModals: () => set({
        showObjectiveModal: false,
        showReportModal: false,
        showOrgSettings: false,
        showHelp: false,
        showHistoryModal: false,
        editingObjective: null,
        reportingObjective: null,
        historyObjective: null,
        menuOpenId: null,
      }),

      // Actions - Selection
      setSelectedIdx: (selectedIdx) => set({ selectedIdx }),
      setHoveredObjId: (hoveredObjId) => set({ hoveredObjId }),
      toggleExpanded: (id) => set((s) => {
        const next = new Set(s.expandedIds)
        if (next.has(id)) next.delete(id)
        else next.add(id)
        return { expandedIds: next }
      }),
      setMenuOpenId: (menuOpenId) => set({ menuOpenId }),
      selectNext: () => set((s) => {
        const next = s.selectedIdx < s.objectives.length - 1 ? s.selectedIdx + 1 : 0
        return { selectedIdx: next, hoveredObjId: s.objectives[next]?.id || null }
      }),
      selectPrev: () => set((s) => {
        const prev = s.selectedIdx > 0 ? s.selectedIdx - 1 : s.objectives.length - 1
        return { selectedIdx: prev, hoveredObjId: s.objectives[prev]?.id || null }
      }),
      selectByNumber: (num) => set((s) => {
        const idx = num - 1
        if (idx >= 0 && idx < s.objectives.length) {
          return { selectedIdx: idx, hoveredObjId: s.objectives[idx].id }
        }
        return {}
      }),

      // Actions - Chart
      setChartPeriod: (chartPeriod) => set({ chartPeriod }),

      // Actions - Theme
      setTheme: (theme) => {
        set({ theme })
        if (typeof window !== "undefined") {
          localStorage.setItem("theme", theme)
          document.documentElement.classList.toggle(
            "dark",
            theme === "dark" || (theme === "system" && window.matchMedia("(prefers-color-scheme: dark)").matches)
          )
        }
      },
      cycleTheme: () => {
        const current = get().theme
        const next = current === "light" ? "dark" : current === "dark" ? "system" : "light"
        get().setTheme(next)
      },

      // Actions - Org Settings
      setOrgSettingsTab: (orgSettingsTab) => set({ orgSettingsTab }),

      // Actions - Objective Form
      setObjectiveFormField: (field, value) => set((s) => ({
        objectiveForm: { ...s.objectiveForm, [field]: value },
      })),
      addKeyResult: () => set((s) => ({
        objectiveForm: {
          ...s.objectiveForm,
          keyResults: [
            ...s.objectiveForm.keyResults,
            { id: crypto.randomUUID(), title: "", targetValue: 100, startValue: 0, unit: "%" },
          ],
        },
      })),
      updateKeyResult: (id, field, value) => set((s) => ({
        objectiveForm: {
          ...s.objectiveForm,
          keyResults: s.objectiveForm.keyResults.map((kr) =>
            kr.id === id ? { ...kr, [field]: value } : kr
          ),
        },
      })),
      removeKeyResult: (id) => set((s) => ({
        objectiveForm: {
          ...s.objectiveForm,
          keyResults: s.objectiveForm.keyResults.filter((kr) => kr.id !== id),
        },
      })),
      setKeyResults: (keyResults) => set((s) => ({
        objectiveForm: { ...s.objectiveForm, keyResults },
      })),
      resetObjectiveForm: () => set({ objectiveForm: { ...defaultObjectiveForm } }),
      populateObjectiveForm: (objective) => set({
        objectiveForm: {
          title: objective.title,
          description: objective.description || "",
          endDate: objective.end_date || defaultObjectiveForm.endDate,
          keyResults: objective.key_results.map((kr) => ({
            id: kr.id,
            title: kr.title,
            targetValue: kr.target_value,
            startValue: kr.current_value,
            unit: kr.unit,
          })),
        },
      }),

      // Actions - Report Form
      setReportValue: (krId, value) => set((s) => ({
        reportForm: { ...s.reportForm, values: { ...s.reportForm.values, [krId]: value } },
      })),
      setReportNote: (note) => set((s) => ({ reportForm: { ...s.reportForm, note } })),
      resetReportForm: () => set({ reportForm: { ...defaultReportForm } }),
      populateReportForm: (objective) => set({
        reportForm: {
          values: Object.fromEntries(objective.key_results.map((kr) => [kr.id, kr.current_value])),
          note: "",
        },
      }),

      // Actions - Invite Form
      setInviteEmail: (email) => set((s) => ({ inviteForm: { ...s.inviteForm, email } })),
      setInviteRole: (role) => set((s) => ({ inviteForm: { ...s.inviteForm, role } })),
      resetInviteForm: () => set({ inviteForm: { ...defaultInviteForm } }),

      // Actions - Login Form
      setLoginEmail: (loginEmail) => set({ loginEmail }),
      setLoginOtp: (loginOtp) => set({ loginOtp }),
      setLoginOtpDigit: (index, digit) => set((s) => {
        const newOtp = [...s.loginOtp]
        newOtp[index] = digit.slice(-1)
        return { loginOtp: newOtp }
      }),
      setLoginStep: (loginStep) => set({ loginStep }),
      resetLoginForm: () => set({ loginEmail: "", loginOtp: ["", "", "", "", "", ""], loginStep: "email" }),

      // Actions - Create Org
      setCreateOrgName: (createOrgName) => set({ createOrgName }),
      resetCreateOrgForm: () => set({ createOrgName: "" }),

      // Actions - Loading
      setLoading: (key, value) => set((s) => ({ loading: { ...s.loading, [key]: value } })),

      // Actions - Messages
      setError: (error) => set({ error }),
      setSuccess: (success) => {
        set({ success })
        if (success) setTimeout(() => set({ success: "" }), 3000)
      },
      clearMessages: () => set({ error: "", success: "" }),
    }),
    {
      name: "okr-app-storage",
      storage: createJSONStorage(() => localStorage),
      partialize: (state) => ({
        // Only persist these fields
        theme: state.theme,
        chartPeriod: state.chartPeriod,
        expandedIds: Array.from(state.expandedIds),
        // Persist form data so nothing is lost
        objectiveForm: state.objectiveForm,
        reportForm: state.reportForm,
        inviteForm: state.inviteForm,
        loginEmail: state.loginEmail,
        createOrgName: state.createOrgName,
        orgSettingsTab: state.orgSettingsTab,
      }),
      onRehydrateStorage: () => (state) => {
        // Convert expandedIds array back to Set
        if (state && Array.isArray(state.expandedIds)) {
          state.expandedIds = new Set(state.expandedIds as unknown as string[])
        }
      },
    }
  )
)

// Selector hooks for common patterns
export const useObjectives = () => useAppStore((s) => s.objectives)
export const useSelectedObjective = () => useAppStore((s) =>
  s.selectedIdx >= 0 && s.selectedIdx < s.objectives.length ? s.objectives[s.selectedIdx] : null
)
export const useIsAdmin = () => useAppStore((s) => s.orgRole === "owner" || s.orgRole === "admin")
export const useTheme = () => useAppStore((s) => s.theme)
export const useChartPeriod = () => useAppStore((s) => s.chartPeriod)
export const useModals = () => useAppStore((s) => ({
  showObjectiveModal: s.showObjectiveModal,
  showReportModal: s.showReportModal,
  showOrgSettings: s.showOrgSettings,
  showHelp: s.showHelp,
  showHistoryModal: s.showHistoryModal,
}))
