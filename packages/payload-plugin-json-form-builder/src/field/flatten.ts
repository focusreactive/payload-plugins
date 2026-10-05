import type { FieldHook } from "payload";
import { flatten } from "./typedJson.js";

// Everything outside the app reads plain values, so a site reads `settings.hero.title` by key in
// any language. Everything inside keeps the typed shape, and that is not a preference: the admin
// draws the form from the types, and a script that read flat values and wrote the document back
// would erase the shape. A session is what tells them apart — the admin always has one, a build or
// a frontend arriving over HTTP does not.
export const flattenTypedJson: FieldHook = ({ req, value }) =>
  req.payloadAPI !== "local" && !req.user ? flatten(value) : value;
