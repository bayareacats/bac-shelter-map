import { initializeApp } from "firebase-admin/app";
import { getFirestore } from "firebase-admin/firestore";
import axios from "axios";
import { ShelterluvCat } from "./types/cat-info.js";
import {
    getRoomIdForShelterluvLocation,
    getShelterluvLocationLabel,
} from "./location-mapping.js";

interface ShelterluvAnimalsResponse {
    animals: ShelterluvCat[];
    has_more: boolean;
}

const DEFAULT_PROJECT_ID = "bayareacats-38b74";
const LIMIT = 100;

function getArgValue(name: string): string | undefined {
    const prefix = `--${name}=`;
    return process.argv.find((arg) => arg.startsWith(prefix))?.slice(prefix.length);
}

async function fetchInCustodyAnimals(apiKey: string): Promise<ShelterluvCat[]> {
    let offset = 0;
    let hasMore = true;
    const animals: ShelterluvCat[] = [];

    while (hasMore) {
        const response = await axios.get<ShelterluvAnimalsResponse>(
            "https://www.shelterluv.com/api/v1/animals",
            {
                headers: {
                    "x-api-key": apiKey,
                },
                params: {
                    status_type: "in custody",
                    offset,
                    limit: LIMIT,
                },
                timeout: 10000,
            }
        );

        animals.push(...response.data.animals);
        hasMore = response.data.has_more;
        offset += LIMIT;
    }

    return animals;
}

async function main() {
    const write = process.argv.includes("--write");
    const projectId = getArgValue("project") ?? DEFAULT_PROJECT_ID;
    const apiKey = process.env.SHELTERLUV_API_KEY;

    if (!apiKey) {
        throw new Error("Set SHELTERLUV_API_KEY before running this script.");
    }

    initializeApp({ projectId });
    const db = getFirestore();

    const animals = await fetchInCustodyAnimals(apiKey);
    const snapshot = await db.collection("cats").get();
    const existingCatsById = new Map(snapshot.docs.map((doc) => [doc.id, doc.data()]));

    const updates = animals
        .filter((animal) => existingCatsById.has(animal.ID.toString()))
        .map((animal) => {
            const id = animal.ID.toString();
            const existingCat = existingCatsById.get(id);
            const shelterluvLocationLabel = getShelterluvLocationLabel(animal.CurrentLocation);
            const shelterluvRoomId = getRoomIdForShelterluvLocation(animal.CurrentLocation);
            const fields: Record<string, unknown> = {
                Status: animal.Status ?? null,
                litterGroupId: animal.LitterGroupId?.toString() ?? null,
                shelterluvLocation: animal.CurrentLocation ?? null,
                shelterluvLocationLabel,
                shelterluvRoomId,
            };

            if (!animal.InFoster && shelterluvRoomId && existingCat?.manualRoomOverride !== true) {
                fields.roomId = shelterluvRoomId;
                fields.manualRoomOverride = false;
            }

            return {
                id,
                name: animal.Name,
                fields,
            };
        });

    const missing = animals.filter((animal) => !existingCatsById.has(animal.ID.toString()));

    console.log(
        JSON.stringify(
            {
                mode: write ? "write" : "dry-run",
                projectId,
                fetchedInCustodyAnimals: animals.length,
                existingDocsToUpdate: updates.length,
                mappedShelterluvRooms: updates.filter((update) => update.fields.shelterluvRoomId).length,
                missingDocsSkipped: missing.length,
                sampleUpdates: updates.slice(0, 10),
            },
            null,
            2
        )
    );

    if (!write) {
        console.log("Dry run only. Re-run with --write to update Firestore.");
        return;
    }

    for (let i = 0; i < updates.length; i += 500) {
        const batch = db.batch();
        for (const update of updates.slice(i, i + 500)) {
            batch.update(db.collection("cats").doc(update.id), update.fields);
        }
        await batch.commit();
    }

    console.log(`Updated Status and Shelterluv location on ${updates.length} Firestore cat documents.`);
}

main().catch((error) => {
    console.error(error);
    process.exit(1);
});
