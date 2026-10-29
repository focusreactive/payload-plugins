import type { Crossing } from "../../contract.js";

export type EmbedResolver = (name: string | undefined, data: unknown) => Crossing | null;
