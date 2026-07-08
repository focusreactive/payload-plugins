import { Fragment } from "react";

import { Image } from "./Image";
import type { MediaProps } from "./types";
import { Video } from "./Video";

export type { MediaData, MediaProps, ImageOverrides, VideoOverrides, PreparedMedia } from "./types";
export { ImageAspectRatio } from "./types";

export function Media(props: MediaProps) {
  const { className, htmlElement = "div", onClick, onLoad, visualEditing } = props;

  if (!props.src) {
    return null;
  }

  const Tag = htmlElement === null ? Fragment : htmlElement;
  const wrapperProps = htmlElement === null ? {} : { className, ...visualEditing };

  return (
    <Tag {...wrapperProps}>
      {props.kind === "video" ? (
        <Video
          onClick={onClick}
          poster={props.poster}
          src={props.src}
          videoProps={props.videoProps}
        />
      ) : (
        <Image
          alt={props.alt}
          height={props.height}
          imageProps={props.imageProps}
          onClick={onClick}
          onLoad={onLoad}
          src={props.src}
          width={props.width}
        />
      )}
    </Tag>
  );
}
