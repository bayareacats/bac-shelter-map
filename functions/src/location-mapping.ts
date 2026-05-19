interface ShelterluvLocation {
    Tier1?: string;
    Tier2?: string;
}

interface ShelterluvRoomAssignmentAnimal {
    ID: string;
    LitterGroupId?: number | string | null;
    Status?: string | null;
    CurrentLocation?: ShelterluvLocation | null;
}

const BEHAVIOR_STATUS = "Unavailable In-Shelter (Behavior)";

const LOCATION_TO_ROOM_ID: Record<string, string> = {
    "Petco Room 1, Kennel 1": "room-1-k1",
    "Petco Room 1, Kennel 2": "room-1-k2",
    "Petco Room 1, Kennel 3": "room-1-k3",
    "Petco Room 1, Kennel 4": "room-1-k4",
    "Petco Room 1, Kennel 5": "room-1-k5",
    "Petco Room 1, Kennel 6": "room-1-k6",
    "Petco Room 2": "room-2",
    "Petco Room 3": "room-3",
    "Petco Room 4": "room-4",
};

function getShelterluvLocationLabel(location?: ShelterluvLocation | null): string | null {
    const tier1 = location?.Tier1?.trim();
    const tier2 = location?.Tier2?.trim();

    if (!tier1) return null;
    if (!tier2) return tier1;
    return `${tier1}, ${tier2}`;
}

function getRoomIdForShelterluvLocation(location?: ShelterluvLocation | null): string | null {
    const label = getShelterluvLocationLabel(location);
    if (!label) return null;
    return LOCATION_TO_ROOM_ID[label] ?? null;
}

function getLitterGroupKey(animal: ShelterluvRoomAssignmentAnimal): string {
    if (animal.LitterGroupId != null && animal.LitterGroupId !== "") {
        return animal.LitterGroupId.toString();
    }
    return `cat:${animal.ID}`;
}

function getDividerSideAssignments(
    animals: ShelterluvRoomAssignmentAnimal[]
): Map<string, "left" | "right" | null> {
    const animalsByRoomId = new Map<string, ShelterluvRoomAssignmentAnimal[]>();

    for (const animal of animals) {
        const roomId = getRoomIdForShelterluvLocation(animal.CurrentLocation);
        if (!roomId) continue;
        animalsByRoomId.set(roomId, [...(animalsByRoomId.get(roomId) ?? []), animal]);
    }

    const assignments = new Map<string, "left" | "right" | null>();

    for (const roomAnimals of animalsByRoomId.values()) {
        const litterGroups = getDividerEligibleLitterGroups(roomAnimals).sort(
            ([aKey, aAnimals], [bKey, bAnimals]) => bAnimals.length - aAnimals.length || aKey.localeCompare(bKey)
        );

        if (litterGroups.length <= 1) {
            if (
                roomAnimals.length === 2 &&
                roomAnimals.some((animal) => animal.Status === BEHAVIOR_STATUS)
            ) {
                const [leftAnimal, rightAnimal] = [...roomAnimals].sort((a, b) =>
                    a.ID.toString().localeCompare(b.ID.toString())
                );
                assignments.set(leftAnimal.ID.toString(), "left");
                assignments.set(rightAnimal.ID.toString(), "right");
                continue;
            }

            for (const animal of roomAnimals) assignments.set(animal.ID.toString(), null);
            continue;
        }

        let leftCount = 0;
        let rightCount = 0;
        const assignedAnimalIds = new Set<string>();

        for (const [, litterAnimals] of litterGroups) {
            const side = leftCount <= rightCount ? "left" : "right";
            for (const animal of litterAnimals) {
                assignments.set(animal.ID.toString(), side);
                assignedAnimalIds.add(animal.ID.toString());
            }

            if (side === "left") {
                leftCount += litterAnimals.length;
            } else {
                rightCount += litterAnimals.length;
            }
        }

        for (const animal of roomAnimals) {
            const id = animal.ID.toString();
            if (!assignedAnimalIds.has(id)) assignments.set(id, null);
        }
    }

    return assignments;
}

function getDividerEligibleLitterGroups(animals: ShelterluvRoomAssignmentAnimal[]) {
    const animalsByLitterGroup = new Map<string, ShelterluvRoomAssignmentAnimal[]>();
    for (const animal of animals) {
        const key = getLitterGroupKey(animal);
        animalsByLitterGroup.set(key, [...(animalsByLitterGroup.get(key) ?? []), animal]);
    }

    return Array.from(animalsByLitterGroup.entries()).filter(
        ([, litterAnimals]) =>
            litterAnimals.length > 1 ||
            litterAnimals.some((animal) => animal.Status === BEHAVIOR_STATUS)
    );
}

export {
    BEHAVIOR_STATUS,
    getDividerSideAssignments,
    getLitterGroupKey,
    getRoomIdForShelterluvLocation,
    getShelterluvLocationLabel,
    ShelterluvLocation,
};
