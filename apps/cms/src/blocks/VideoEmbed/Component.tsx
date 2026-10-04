import { SectionHeader } from "@/components/SectionHeader";
import { SectionContainer } from "@/components/shared";
import { prepareSectionHeaderProps } from "@/lib/adapters/prepareSectionHeaderProps";
import type { VideoEmbedBlock } from "@/payload-types";

import { preparePosterUrl } from "./preparePoster";
import { VideoPlayer } from "./ui";

export function VideoEmbedBlockComponent({
  eyebrow,
  heading,
  description,
  videoId,
  title,
  poster,
  aspect,
  section,
  id,
}: VideoEmbedBlock) {
  const header = prepareSectionHeaderProps({ description, eyebrow, heading });

  return (
    <SectionContainer sectionData={{ ...section, id }}>
      {header && <SectionHeader {...header} className="mb-10" />}
      <div className="mx-auto max-w-[960px]">
        <VideoPlayer
          videoId={videoId}
          title={title}
          posterUrl={preparePosterUrl(poster)}
          aspect={aspect}
        />
      </div>
    </SectionContainer>
  );
}
