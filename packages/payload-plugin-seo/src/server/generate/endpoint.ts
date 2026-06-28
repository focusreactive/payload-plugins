import type { Endpoint, PayloadRequest } from "payload";
import { getPluginConfig } from "../../config";
import { PLUGIN_NAME } from "../../constants";
import { GENERATE_ENDPOINT_PATH } from "../../constants/generation";
import type { LengthUnit } from "../../measure/measure";
import { resolveApiKey } from "./apiKey";
import { generateForField } from "./generateForField";
import type { SeoFieldKind } from "./prompts";

interface GenerateBody {
  kind?: SeoFieldKind;
  contentHtml?: string;
  locale?: string;
  range?: { min: number; max: number; unit: LengthUnit };
}

function json(data: unknown, status: number): Response {
  return Response.json(data, {
    status,
    headers: { "Content-Type": "application/json" },
  });
}

export function createGenerateEndpoint(): Endpoint {
  return {
    path: GENERATE_ENDPOINT_PATH,
    method: "post",
    handler: async (req: PayloadRequest): Promise<Response> => {
      if (!req.user) return json({ error: "Unauthorized" }, 401);

      const config = getPluginConfig();
      const apiKey = resolveApiKey(config.generation);
      if (!apiKey) return json({ error: "Generation is not configured" }, 503);

      const body = ((await req.json?.()) ?? {}) as GenerateBody;
      if (
        (body.kind !== "title" && body.kind !== "description") ||
        typeof body.contentHtml !== "string" ||
        !body.range
      ) {
        return json({ error: "Invalid request body" }, 400);
      }

      try {
        const text = await generateForField({
          kind: body.kind,
          contentHtml: body.contentHtml,
          range: body.range,
          locale: body.locale,
          config: config.generation ?? {},
          apiKey,
        });

        return json({ text }, 200);
      } catch (err) {
        req.payload.logger.error(`[${PLUGIN_NAME}] generation failed: ${(err as Error).message}`);

        return json({ error: "Generation failed" }, 502);
      }
    },
  };
}
