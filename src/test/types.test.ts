import { describe, it, expect } from "vitest"

describe("types", () => {
  it("exports createObjectiveSchema", async () => {
    const { createObjectiveSchema } = await import("@/lib/types")
    expect(createObjectiveSchema).toBeDefined()
    expect(createObjectiveSchema.parse).toBeTypeOf("function")
  })

  it("validates objective payload", async () => {
    const { createObjectiveSchema } = await import("@/lib/types")

    const valid = {
      title: "Test Objective",
      description: "This is a test description for the objective",
      endDate: "2025-12-31",
      keyResults: [
        { title: "KR1", targetValue: 100, startValue: 0, unit: "%" }
      ]
    }

    const result = createObjectiveSchema.safeParse(valid)
    expect(result.success).toBe(true)
  })

  it("rejects invalid objective", async () => {
    const { createObjectiveSchema } = await import("@/lib/types")

    const invalid = {
      title: "",
      description: "short",
      endDate: "invalid",
      keyResults: []
    }

    const result = createObjectiveSchema.safeParse(invalid)
    expect(result.success).toBe(false)
  })
})
