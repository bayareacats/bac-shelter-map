import { onSchedule } from "firebase-functions/v2/scheduler";
import { defineSecret } from "firebase-functions/params";
import { initializeApp } from 'firebase-admin/app';
import { getFirestore, FieldValue } from 'firebase-admin/firestore';
import { logger } from "firebase-functions/v2";
import { ShelterluvCat } from "./types/cat-info.js";
import axios from "axios";

function toUnixSecondsFromPossibleTimestamp(v: unknown): number | null {
    if (v == null) return null;
    if (typeof v === "number") {
        // If it's very large, assume milliseconds
        if (v > 1e12) return Math.floor(v / 1000);
        // If it looks like seconds
        if (v > 1e9) return v;
        return null;
    }
    if (typeof v === "string") {
        const asNum = Number(v);
        if (!Number.isNaN(asNum)) {
            if (asNum > 1e12) return Math.floor(asNum / 1000);
            if (asNum > 1e9) return asNum;
        }
        const parsed = Date.parse(v);
        if (!Number.isNaN(parsed)) return Math.floor(parsed / 1000);
    }
    return null;
}

initializeApp();

const db = getFirestore();
const shelterluvApiKey = defineSecret("SHELTERLUV_API_KEY");

export const syncShelterluvCats = onSchedule(
    {
        schedule: "every 15 minutes",
        secrets: [shelterluvApiKey],
    },
    async () => {
        try {
            const apiKey = shelterluvApiKey.value();

            const limit = 100;
            let offset = 0;
            let has_more = true;
            const allCats: ShelterluvCat[] = [];

            while (has_more) {
                const response = await axios.get(
                    "https://www.shelterluv.com/api/v1/animals",
                    {
                        headers: {
                            "x-api-key": apiKey,
                        },
                        params: {
                            status_type: "in custody",
                            offset: offset,
                            limit: limit,
                        },
                        timeout: 10000,
                    }
                );
                const cats = response.data.animals;
                allCats.push(...cats);
                has_more = response.data.has_more;
                offset += limit;
            }

            logger.info("Cats fetched from Shelterluv: ", allCats.length);

            const apiCatIds = new Set<string>();

            for (const cat of allCats) {
                apiCatIds.add(cat.ID.toString());
            }

            const batch = db.batch();

            allCats.forEach((cat: ShelterluvCat) => {
                const ref = db.collection("cats").doc(cat.ID);

                const birthDate = toUnixSecondsFromPossibleTimestamp(cat.DOBUnixTime);

                batch.set(
                    ref,
                    {
                        id: cat.ID,
                        name: cat.Name,
                        sex: cat.Sex ?? null,
                        color: cat.Color ?? null,
                        pattern: cat.Pattern ?? null,
                        photoUrl: cat.CoverPhoto ?? null,
                        intakeDate: cat.LastIntakeUnixTime ?? null,
                        birthDate: birthDate,
                        inFoster: cat.InFoster,
                        Status: cat.Status ?? null,
                        lastSynced: FieldValue.serverTimestamp()
                    },
                    { merge: true }
                );
            });

            const snapshot = await db
                .collection("cats")
                .get();

            logger.info("Shelterluv cats in DB to check for adoption: ", snapshot.size);

            snapshot.docs.forEach((doc) => {
                if (!apiCatIds.has(doc.id)) {
                    batch.update(doc.ref, {
                        Status: "Adopted",
                        roomId: null,        // remove from floorplan
                        adoptedAt: new Date(),
                    });
                }
            });

            await batch.commit();

            logger.info(
                `Shelterluv sync completed.`
            );

        } catch (error) {
            if (axios.isAxiosError(error)) {
                logger.error("Shelterluv API error", {
                    status: error.response?.status,
                    data: error.response?.data
                });
            } else {
                logger.error("Unexpected error during Shelterluv sync.", error);
            }

            throw error; // ensures function reports failure
        }
    }
);
