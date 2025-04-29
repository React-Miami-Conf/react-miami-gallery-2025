"use client";
import React, { useEffect } from "react";
import { ImageProps } from "../utils/types";

interface PreloadImagesProps {
  images: ImageProps[];
}

const PreloadImages: React.FC<PreloadImagesProps> = ({ images }) => {
  useEffect(() => {
    images.forEach((img) => {
      if (img.url) {
        const preloadImg = new window.Image();
        preloadImg.src = img.url;
      }
    });
  }, [images]);
  return null;
};

export default PreloadImages;
