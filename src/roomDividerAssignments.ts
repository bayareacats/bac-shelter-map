import type { Cat } from "./types/Cat";

const BEHAVIOR_STATUS = "Unavailable In-Shelter (Behavior)";

export function getLitterGroupKey(cat: Pick<Cat, "id" | "litterGroupId">): string {
  return cat.litterGroupId ?? `cat:${cat.id}`;
}

export function roomNeedsDivider(cats: Cat[]): boolean {
  const dividerEligibleGroups = getDividerEligibleLitterGroups(cats);
  if (dividerEligibleGroups.length > 1) return true;
  return cats.length === 2 && cats.some((cat) => cat.Status === BEHAVIOR_STATUS);
}

function getDividerEligibleLitterGroups(cats: Cat[]) {
  const catsByLitterGroup = new Map<string, Cat[]>();
  for (const cat of cats) {
    const key = getLitterGroupKey(cat);
    catsByLitterGroup.set(key, [...(catsByLitterGroup.get(key) ?? []), cat]);
  }

  return Array.from(catsByLitterGroup.entries()).filter(
    ([, litterCats]) =>
      litterCats.length > 1 ||
      litterCats.some((cat) => cat.Status === BEHAVIOR_STATUS)
  );
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
    const litterGroups = getDividerEligibleLitterGroups(roomCats).sort(
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
    const assignedCatIds = new Set<string>();

    for (const [, litterCats] of litterGroups) {
      const side = leftCount <= rightCount ? "left" : "right";
      for (const cat of litterCats) {
        assignments.set(cat.id, side);
        assignedCatIds.add(cat.id);
      }

      if (side === "left") {
        leftCount += litterCats.length;
      } else {
        rightCount += litterCats.length;
      }
    }

    for (const cat of roomCats) {
      if (!assignedCatIds.has(cat.id)) assignments.set(cat.id, null);
    }
  }

  return assignments;
}
