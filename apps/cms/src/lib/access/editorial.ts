import { or } from "./or";
import { author } from "./author";
import { superAdmin } from "./superAdmin";

/**
 * Who may change content. Deliberately excludes the "user" role: the starter granted create, update
 * and delete on every content collection to all four roles alike, which made the demo's own claim
 * that a fee-earner can only touch their own account false, and let that account delete any page.
 */
export const editorial = or(superAdmin, author);
