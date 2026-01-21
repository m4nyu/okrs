import { z } from "zod"

// Zod Schemas for validation
export const keyResultSchema = z.object({
  title: z.string().min(1, "Title is required"),
  targetValue: z.number().min(0),
  startValue: z.number().min(0).default(0),
  unit: z.enum(["%", "#", "$", "hrs", "users", "score"]),
})

export const createObjectiveSchema = z.object({
  title: z.string().min(1, "Title is required").max(200),
  description: z.string().min(10, "Description must provide context (at least 10 characters)").max(1000),
  endDate: z.string().refine(d => !Number.isNaN(Date.parse(d)), "Invalid date"),
  keyResults: z.array(keyResultSchema).max(10),
})

export type CreateObjectiveInput = z.infer<typeof createObjectiveSchema>
export type KeyResultInput = z.infer<typeof keyResultSchema>

// Database types
export interface Objective {
  id: string
  user_id: string
  title: string
  description: string | null
  start_date: string
  end_date: string
  status: 'active' | 'completed' | 'cancelled'
  share_token: string
  is_public: boolean
  created_at: string
  updated_at: string
  key_results?: KeyResult[]
}

export interface KeyResult {
  id: string
  objective_id: string
  title: string
  target_value: number
  current_value: number
  unit: string
  created_at: string
  updated_at: string
  progress_updates?: ProgressUpdate[]
}

export interface ProgressUpdate {
  id: string
  key_result_id: string
  previous_value: number
  new_value: number
  note: string | null
  created_at: string
}

export interface ObjectiveWithProgress extends Objective {
  key_results: KeyResult[]
  overall_progress: number
}

// Organization types
export interface Organization {
  id: string
  name: string
  slug: string
  domain: string | null
  auto_join_domain: boolean
  created_by: string
  created_at: string
  updated_at: string
}

export interface OrgMember {
  id: string
  org_id: string
  user_id: string
  role: 'owner' | 'admin' | 'member'
  joined_at: string
  user_email?: string
  user_name?: string
}

export interface OrgInvite {
  id: string
  org_id: string
  email: string
  role: 'owner' | 'admin' | 'member'
  invited_by: string
  expires_at: string
  created_at: string
}
