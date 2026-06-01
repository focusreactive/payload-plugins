import type { BeforeListTableServerProps } from "payload";

import AiPageBuilderButton from "./AiPageBuilderButton";

type AiPageBuilderServerProps = BeforeListTableServerProps & {
  basePath: string;
};

async function AiPageBuilderButtonServer(props: AiPageBuilderServerProps) {
  const { collectionSlug, basePath } = props;

  if (!collectionSlug) return null;

  return <AiPageBuilderButton collectionSlug={collectionSlug} basePath={basePath} />;
}

export default AiPageBuilderButtonServer;
