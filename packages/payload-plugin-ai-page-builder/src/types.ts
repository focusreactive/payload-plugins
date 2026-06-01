import type { LanguageModel } from "ai";
import type { z } from "zod";

export interface AiBlockDefinition<T extends z.ZodRawShape = z.ZodRawShape> {
  /** Must match the Payload Block slug */
  slug: string;
  /** Zod schema for the AI-generated content fields (excluding blockType, id) */
  schema: z.ZodObject<T>;
  /** Optional description to help the AI understand when to use this block */
  description?: string;
}

export interface AiPageCollectionConfig {
  /** Payload collection slug */
  slug: string;
  /** Name of the blocks field. Defaults to "sections" */
  blocksField?: string;
  /** Name of the title field. Defaults to "title" */
  titleField?: string;
  /** Name of the slug field. Defaults to "slug" */
  slugField?: string;
}

export interface AiPageBuilderPluginConfig {
  /** Disable the plugin without removing it. Defaults to true */
  enabled?: boolean;
  /** Vercel AI SDK language model instance (e.g. openai('gpt-4o')) */
  model: LanguageModel;
  /** Collections to add the AI page builder to */
  collections: AiPageCollectionConfig[];
  /** Available block definitions with Zod schemas for AI generation */
  blocks: AiBlockDefinition[];
  /** Base path for the generate endpoint. Defaults to "/ai-page-builder" */
  basePath?: string;
}
