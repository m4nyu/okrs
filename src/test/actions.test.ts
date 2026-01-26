import { describe, expect, it } from "vitest"

describe("actions", () => {
  it("exports objective actions", async () => {
    const { createObjective, updateObjective, updateProgress, deleteObjective } = await import("@/lib/actions")
    expect(createObjective).toBeTypeOf("function")
    expect(updateObjective).toBeTypeOf("function")
    expect(updateProgress).toBeTypeOf("function")
    expect(deleteObjective).toBeTypeOf("function")
  })

  it("exports org actions", async () => {
    const { generateOrg, updateOrg } = await import("@/lib/actions")
    expect(generateOrg).toBeTypeOf("function")
    expect(updateOrg).toBeTypeOf("function")
  })

  it("exports member actions", async () => {
    const { getMembers, removeMember, renameMember, setMemberRole, transferOwnership } = await import("@/lib/actions")
    expect(getMembers).toBeTypeOf("function")
    expect(removeMember).toBeTypeOf("function")
    expect(renameMember).toBeTypeOf("function")
    expect(setMemberRole).toBeTypeOf("function")
    expect(transferOwnership).toBeTypeOf("function")
  })

  it("exports invite actions", async () => {
    const { getInvites, sendInvite, acceptInvite, cancelInvite } = await import("@/lib/actions")
    expect(getInvites).toBeTypeOf("function")
    expect(sendInvite).toBeTypeOf("function")
    expect(acceptInvite).toBeTypeOf("function")
    expect(cancelInvite).toBeTypeOf("function")
  })
})
