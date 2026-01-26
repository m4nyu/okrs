import { describe, it, expect } from "vitest"

describe("pages", () => {
  it("/ exports default", async () => {
    const mod = await import("@/app/page")
    expect(mod.default).toBeDefined()
  })

  it("/org/[slug] exports default", async () => {
    const mod = await import("@/app/org/[slug]/page")
    expect(mod.default).toBeDefined()
  })

  it("/invite/[token] exports default", async () => {
    const mod = await import("@/app/invite/[token]/page")
    expect(mod.default).toBeDefined()
  })

  it("/login exports default", async () => {
    const mod = await import("@/app/login/page")
    expect(mod.default).toBeDefined()
  })
})

describe("api routes", () => {
  it("/api/ai exports POST", async () => {
    const mod = await import("@/app/api/ai/route")
    expect(mod.POST).toBeDefined()
  })

  it("/api/auth/callback exports GET", async () => {
    const mod = await import("@/app/api/auth/callback/route")
    expect(mod.GET).toBeDefined()
  })
})
