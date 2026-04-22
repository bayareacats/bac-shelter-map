import type { Cat } from "../types/Cat";
import { CatIcon } from "./CatIcon";
import { useDroppable } from "@dnd-kit/core";


interface Props {
    cats: Cat[];
    draggable?: boolean;
    title?: string;
    droppableId?: string;

}

export function CatList({ cats, draggable = false, title, droppableId }: Props) {
    const { setNodeRef, isOver } = useDroppable({
        id: droppableId ?? "",
        disabled: !droppableId,
    });
    return (
        <section style={{
            display: "flex",
            flexDirection: "column",
            height: "100%",
            minHeight: 0
        }}>
            {title && (
                <div
                    style={{
                        display: "flex",
                        flexDirection: "column",
                        flexShrink: 0,
                        marginBottom: "0.5rem"
                    }}
                >
                    <h3 style={{ margin: 0 }}>{title}</h3>
                </div>
            )}

            <div style={{
                flex: 1,
                minHeight: 0,
                display: "flex",
                flexDirection: "column"
            }}>
                <div
                    ref={droppableId ? setNodeRef : undefined}
                    style={{
                        border: "1px solid #334155",
                        borderRadius: "8px",
                        overflow: "hidden",
                        backgroundColor: "#1e293b",
                        boxShadow: "0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06)",
                        flex: 1,
                        minHeight: 0,
                        boxSizing: "border-box",
                        display: "flex",
                        flexDirection: "column"
                    }}
                ><div
                    style={{
                        flex: 1,
                        overflowY: "auto",
                        padding: "0.5rem",
                        background: isOver ? "rgba(99, 102, 241, 0.2)" : "transparent",
                        transition: "background-color 0.2s ease",

                    }}
                >
                        {cats.map((cat) =>
                            draggable ? (
                                <CatIcon key={cat.id} cat={cat} />
                            ) : (
                                <div
                                    key={cat.id}
                                    style={{
                                        display: "flex",
                                        alignItems: "start",
                                        gap: "0.5rem",
                                        padding: "0.5rem",
                                        opacity: 0.85,
                                    }}
                                >
                                    <img
                                        src={cat.photoUrl ?? "/placeholder-cat.png"}
                                        width={32}
                                        height={32}
                                        style={{ borderRadius: "50%" }}
                                    />
                                    <span>{cat.name}</span>
                                </div>
                            )
                        )}
                    </div>
                </div>
            </div>
        </section>
    );
}
