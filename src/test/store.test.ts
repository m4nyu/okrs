import { describe, it, expect, beforeEach } from "vitest"
import { useStore, $ } from "@/lib/store"

describe("store", () => {
  beforeEach(() => {
    // Reset store state
    useStore.setState({
      objs: [], members: [], invites: [], view: null, editing: null,
      idx: -1, hover: null, open: new Set(), menu: null, tab: "members",
      range: "Q", theme: "system",
    })
  })

  it("exports useStore and $", () => {
    expect(useStore).toBeDefined()
    expect($).toBeDefined()
  })

  it("$.set updates state", () => {
    $.set("theme", "dark")
    expect(useStore.getState().theme).toBe("dark")
  })

  it("$.show opens view", () => {
    $.show("settings")
    expect(useStore.getState().view).toBe("settings")
  })

  it("$.show with object sets editing", () => {
    const obj = { id: "1", title: "Test" } as any
    $.show("report", obj)
    expect(useStore.getState().view).toBe("report")
    expect(useStore.getState().editing).toBe(obj)
  })

  it("$.hide closes view and menu", () => {
    $.show("settings")
    $.set("menu", "test")
    $.hide()
    expect(useStore.getState().view).toBeNull()
    expect(useStore.getState().editing).toBeNull()
    expect(useStore.getState().menu).toBeNull()
  })

  it("$.flip toggles open set", () => {
    $.flip("id1")
    expect(useStore.getState().open.has("id1")).toBe(true)
    $.flip("id1")
    expect(useStore.getState().open.has("id1")).toBe(false)
  })

  it("$.nav navigates through objs", () => {
    useStore.setState({ objs: [{ id: "a" }, { id: "b" }, { id: "c" }] as any, idx: 0 })
    $.nav(1)
    expect(useStore.getState().idx).toBe(1)
    $.nav(1)
    expect(useStore.getState().idx).toBe(2)
    $.nav(1)
    expect(useStore.getState().idx).toBe(0) // wraps
    $.nav(-1)
    expect(useStore.getState().idx).toBe(2) // wraps back
  })

  it("$.go jumps to index", () => {
    useStore.setState({ objs: [{ id: "a" }, { id: "b" }, { id: "c" }] as any })
    $.go(2)
    expect(useStore.getState().idx).toBe(1)
    expect(useStore.getState().hover).toBe("b")
  })

  it("$.go ignores invalid index", () => {
    useStore.setState({ objs: [{ id: "a" }] as any, idx: 0 })
    $.go(5)
    expect(useStore.getState().idx).toBe(0)
  })
})
