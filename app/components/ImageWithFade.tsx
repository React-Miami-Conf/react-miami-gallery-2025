"use client";
import React, { useState } from "react";
import Image from "next/image";
import { ImageProps } from "../utils/types";

interface ImageWithFadeProps {
  image: ImageProps;
  alt?: string;
}

const ImageWithFade: React.FC<ImageWithFadeProps> = ({ image, alt }) => {
  const [loaded, setLoaded] = useState(false);
  return (
    <div className="relative w-full bg-gray-200 rounded-lg overflow-hidden">
      <Image
        alt={alt || image.alt}
        src={image.webUrl}
        width={720}
        height={480}
        sizes="(max-width: 640px) 100vw,
          (max-width: 1280px) 50vw,
          (max-width: 1536px) 33vw,
          25vw"
        className={`transform rounded-lg brightness-90 transition will-change-auto group-hover:brightness-110 transition-opacity duration-500 ${loaded ? "opacity-100" : "opacity-0"}`}
        style={{ transform: "translate3d(0, 0, 0)" }}
        onLoadingComplete={() => setLoaded(true)}
        loading="lazy"
      />
      {!loaded && (
        <div className="absolute inset-0 bg-gray-200 animate-pulse rounded-lg" />
      )}
    </div>
  );
};

export default ImageWithFade;
