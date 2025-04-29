"use client";

import { useEffect, useRef, useState } from "react";
import { useSearchParams } from "next/navigation";
import Image from "next/image";
import Link from "next/link";
import { ImageProps } from "../utils/types";
import Modal from "./modal";
import { useLastViewedPhoto } from "../utils/useLastViewedPhoto";
import Leaves from "./Icons/Leaves";
import Logo from "./Icons/Logo";
import PreloadImages from "./PreloadImages";

type GalleryProps = {
  collections: {
    [key: string]: ImageProps[];
  };
};

export default function Gallery({ collections }: GalleryProps) {
  const collectionNames = Object.keys(collections);
  const [selectedTab, setSelectedTab] = useState(collectionNames[0]);
  const images = collections[selectedTab] || [];

  const searchParams = useSearchParams();
  const photoId = searchParams.get("photoId");
  const [lastViewedPhoto, setLastViewedPhoto] = useLastViewedPhoto();

  const lastViewedPhotoRef = useRef<HTMLAnchorElement>(null);

  useEffect(() => {
    // This effect keeps track of the last viewed photo in the modal to keep the index page in sync when the user navigates back
    if (lastViewedPhoto && !photoId) {
      lastViewedPhotoRef.current?.scrollIntoView({ block: "center" });
      setLastViewedPhoto(null);
    }
  }, [photoId, lastViewedPhoto, setLastViewedPhoto]);

  return (
    <div>
      {/* Preload only the images for the current tab */}
      <PreloadImages images={images} />
      {photoId && (
        <Modal
          images={images}
          onClose={() => {
            // @ts-ignore
            setLastViewedPhoto(photoId);
          }}
        />
      )}

      {/* Header Card */}
      <div className="after:content relative mb-3 flex h-[340px] flex-col items-center justify-end gap-3 overflow-hidden rounded-lg bg-white/10 px-6 pb-10 pt-28 text-center text-white shadow-highlight after:pointer-events-none after:absolute after:inset-0 after:rounded-lg after:shadow-highlight lg:pt-0">
        <div className="absolute inset-0 flex items-center justify-center opacity-20">
          <span className="flex max-h-full max-w-full items-center justify-center">
            <Leaves />
          </span>
          <span className="absolute left-0 right-0 bottom-0 h-[180px] bg-gradient-to-b from-black/0 via-black to-black"></span>
        </div>
        <Logo />
        <h1 className="mt-6 mb-2 text-base font-bold uppercase tracking-widest">
          2025 Event Photos
        </h1>
        {/* <p className="max-w-[40ch] text-white/75 sm:max-w-[32ch] text-sm">
          A 2 day celebration in Miami of all things React featuring expert
          speakers, the latest in web development, and unparalleled networking!
        </p> */}
        {/* <a
          className="pointer z-10 mt-4 rounded-lg border border-white bg-white px-3 py-2 text-sm font-semibold text-black transition hover:bg-white/10 hover:text-white md:mt-2"
          href="https://www.reactmiami.com/"
          target="_blank"
          rel="noreferrer"
        >
          Learn More
        </a> */}
        {/* Tabs below Learn More */}
        <div className="flex gap-2 mt-4 z-10 justify-center">
          {collectionNames.map((name) => (
            <button
              key={name}
              className={`px-4 py-2 rounded-lg font-semibold text-sm transition border ${
                selectedTab === name
                  ? "bg-white text-black border-white"
                  : "bg-transparent text-white border-white/30 hover:bg-white/10"
              }`}
              onClick={() => setSelectedTab(name)}
            >
              {name}
            </button>
          ))}
        </div>
      </div>
      {/* Masonry Gallery Grid */}
      <div className="columns-1 gap-4 sm:columns-2 xl:columns-3 2xl:columns-4">
        {images.map(({ id, webUrl, alt }: ImageProps) => (
          <Link
            key={id}
            href={`/?photoId=${id}`}
            ref={
              Number(id) === Number(lastViewedPhoto) ? lastViewedPhotoRef : null
            }
            shallow
            className="after:content group relative mb-5 block w-full cursor-zoom-in after:pointer-events-none after:absolute after:inset-0 after:rounded-lg after:shadow-highlight"
          >
            <Image
              alt={alt}
              className="transform rounded-lg brightness-90 transition will-change-auto group-hover:brightness-110"
              style={{ transform: "translate3d(0, 0, 0)" }}
              src={webUrl}
              width={720}
              height={480}
              sizes="(max-width: 640px) 100vw,
                (max-width: 1280px) 50vw,
                (max-width: 1536px) 33vw,
                25vw"
              loading="lazy"
            />
          </Link>
        ))}
      </div>
    </div>
  );
}
