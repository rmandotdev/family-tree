import type { Family } from "./types";

export function parentsOf(fam: Pick<Family, "husbandId" | "wifeId">): string[] {
  return [fam.husbandId, fam.wifeId].filter((id) => id !== undefined);
}
