import { describe, it, expect } from "vitest";
import { isManager, matterVisibilityFilter, intakeVisibilityFilter } from "@/lib/permissions";

describe("isManager", () => {
  it("ADMIN æ˜¯ manager", () => expect(isManager("ADMIN")).toBe(true));
  it("PRINCIPAL_LAWYER æ˜¯ manager", () => expect(isManager("PRINCIPAL_LAWYER")).toBe(true));
  it("LAWYER ä¸æ˜¯ manager", () => expect(isManager("LAWYER")).toBe(false));
  it("ASSISTANT ä¸æ˜¯ manager", () => expect(isManager("ASSISTANT")).toBe(false));
  it("FINANCE ä¸æ˜¯ manager", () => expect(isManager("FINANCE")).toBe(false));
});

describe("matterVisibilityFilter", () => {
  const userId = "user-1";

  it("ADMIN çœ‹Ver todosï¼ˆVolverç©º whereï¼‰", () => {
    expect(matterVisibilityFilter(userId, "ADMIN")).toEqual({});
  });

  it("FINANCE çœ‹Ver todos", () => {
    expect(matterVisibilityFilter(userId, "FINANCE")).toEqual({});
  });

  it("LAWYER çœ‹è‡ªå·±æ‹¥æœ‰æˆ–å‚yçš„Caso", () => {
    const filter = matterVisibilityFilter(userId, "LAWYER");
    expect(filter).toHaveProperty("OR");
    const or = (filter as { OR: unknown[] }).OR;
    expect(or).toHaveLength(2);
    expect(or[0]).toEqual({ ownerId: userId });
    expect(or[1]).toEqual({ members: { some: { userId } } });
  });

  it("ASSISTANT åªçœ‹è‡ªå·±å‚yçš„Caso", () => {
    const filter = matterVisibilityFilter(userId, "ASSISTANT");
    expect(filter).toEqual({ members: { some: { userId } } });
  });
});

describe("intakeVisibilityFilter", () => {
  const userId = "user-1";

  it("ADMIN çœ‹Ver todos", () => {
    expect(intakeVisibilityFilter(userId, "ADMIN")).toEqual({});
  });

  it("LAWYER çœ‹è‡ªå·±Crearæˆ–å‚yçš„", () => {
    const filter = intakeVisibilityFilter(userId, "LAWYER");
    expect(filter).toHaveProperty("OR");
    const or = (filter as { OR: unknown[] }).OR;
    expect(or).toHaveLength(3);
  });
});

