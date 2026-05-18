import { doc, updateDoc } from "firebase/firestore";
import { db } from "./firebase";

export async function updateCatRoom(
  catId: string,
  roomId: string | null,
  dividerSide?: "left" | "right"
) {
  const ref = doc(db, "cats", catId);

  await updateDoc(ref, {
    roomId,
    dividerSide: dividerSide ?? null,
    manualRoomOverride: true,
    updatedAt: new Date(),
  });
}
