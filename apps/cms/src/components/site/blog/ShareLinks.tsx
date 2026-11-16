import React from "react";

interface Props {
  /** The full URL of the article. */
  url: string;
  title: string;
  /** The full URL of the article's picture, for Pinterest. */
  image?: string;
}

const encode = encodeURIComponent;

/** The share buttons beside an article, as the site's `ul.share-links`. */
export function ShareLinks({ url, title, image }: Props) {
  const links = [
    { href: `https://www.facebook.com/sharer/sharer.php?u=${encode(url)}`, network: "facebook" },
    {
      href: `https://twitter.com/intent/tweet?url=${encode(url)}&text=${encode(title)}`,
      network: "twitter",
    },
    {
      href: `https://pinterest.com/pin/create/button/?url=${encode(url)}&description=${encode(title)}${image ? `&media=${encode(image)}` : ""}`,
      network: "pinterest",
    },
    { href: `mailto:?subject=${encode(title)}&body=${encode(url)}`, network: "email" },
  ];

  return (
    <ul className="share-links">
      {links.map(({ network, href }) => (
        <li key={network}>
          <a
            aria-label={network}
            className={network}
            href={href}
            rel="noreferrer"
            target="_blank"
          />
        </li>
      ))}
    </ul>
  );
}
