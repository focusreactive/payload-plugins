import type { Visualization } from "../../../types/visualization";

export const PRESENCE: Visualization = { type: "presence" };

export const resolvePresence = (): Visualization => PRESENCE;
