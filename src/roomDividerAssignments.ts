import type { Cat } from "./types/Cat";

const BEHAVIOR_STATUS = "Unavailable In-Shelter (Behavior)";

function isBehaviorStatus(status: string | null | undefined): boolean {
  return status?.trim().toLowerCase() === BEHAVIOR_STATUS.toLowerCase();
}

export function getLitterGroupKey(cat: Pick<Cat, "id" | "litterGroupId">): string {
  return cat.litterGroupId ?? `cat:${cat.id}`;
}

export function roomNeedsDivider(cats: Cat[]): boolean {
  if (cats.some((cat) => isBehaviorStatus(cat.Status))) return true;

  const litterGroups = getLitterGroups(cats);
  return litterGroups.length > 1;
}

function getLitterGroups(cats: Cat[]) {
  const catsByLitterGroup = new Map<string, Cat[]>();
  for (const cat of cats) {
    const key = getLitterGroupKey(cat);
    catsByLitterGroup.set(key, [...(catsByLitterGroup.get(key) ?? []), cat]);
  }

  return Array.from(catsByLitterGroup.entries());
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
    const litterGroups = getLitterGroups(roomCats).sort(
      ([aKey, aCats], [bKey, bCats]) => bCats.length - aCats.length || aKey.localeCompare(bKey)
    );

    if (litterGroups.length <= 1) {
      if (roomCats.some((cat) => isBehaviorStatus(cat.Status))) {
        const sortedRoomCats = [...roomCats].sort((a, b) => a.id.localeCompare(b.id));
        for (const [index, cat] of sortedRoomCats.entries()) {
          assignments.set(cat.id, index % 2 === 0 ? "left" : "right");
        }
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
