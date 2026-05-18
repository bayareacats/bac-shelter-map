import type { Cat } from "./types/Cat";

const BEHAVIOR_STATUS = "Unavailable In-Shelter (Behavior)";

export function getLitterGroupKey(cat: Pick<Cat, "id" | "litterGroupId">): string {
  return cat.litterGroupId ?? `cat:${cat.id}`;
}

export function roomNeedsDivider(cats: Cat[]): boolean {
  const litterCount = new Set(cats.map(getLitterGroupKey)).size;
  if (litterCount > 1) return true;
  return cats.length === 2 && cats.some((cat) => cat.Status === BEHAVIOR_STATUS);
}

export function getDividerSideAssignments(
  cats: Cat[]
): Map<string, "left" | "right" | null> {
  const catsByRoomId = new Map<string, Cat[]>();

  for (const cat of cats) {
    if (!cat.shelterluvRoomId) continue;
    catsByRoomId.set(cat.shelterluvRoomId, [
      ...(catsByRoomId.get(cat.shelterluvRoomId) ?? []),
      cat,
    ]);
  }

  const assignments = new Map<string, "left" | "right" | null>();

  for (const roomCats of catsByRoomId.values()) {
    const catsByLitterGroup = new Map<string, Cat[]>();
    for (const cat of roomCats) {
      const key = getLitterGroupKey(cat);
      catsByLitterGroup.set(key, [...(catsByLitterGroup.get(key) ?? []), cat]);
    }

    const litterGroups = Array.from(catsByLitterGroup.entries()).sort(
      ([aKey, aCats], [bKey, bCats]) => bCats.length - aCats.length || aKey.localeCompare(bKey)
    );

    if (litterGroups.length <= 1) {
      if (roomCats.length === 2 && roomCats.some((cat) => cat.Status === BEHAVIOR_STATUS)) {
        const [leftCat, rightCat] = [...roomCats].sort((a, b) => a.id.localeCompare(b.id));
        assignments.set(leftCat.id, "left");
        assignments.set(rightCat.id, "right");
        continue;
      }

      for (const cat of roomCats) assignments.set(cat.id, null);
      continue;
    }

    let leftCount = 0;
    let rightCount = 0;

    for (const [, litterCats] of litterGroups) {
      const side = leftCount <= rightCount ? "left" : "right";
      for (const cat of litterCats) {
        assignments.set(cat.id, side);
      }

      if (side === "left") {
        leftCount += litterCats.length;
      } else {
        rightCount += litterCats.length;
      }
    }
  }

  return assignments;
}
