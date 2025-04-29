"use client";
import React, { useEffect } from "react";
import { ImageProps } from "../utils/types";

interface PreloadImagesProps {
  images: ImageProps[];
  preloadThreshold?: number; // Number of images to preload at a time
}

const PreloadImages: React.FC<PreloadImagesProps> = ({ 
  images, 
  preloadThreshold = 12 // Default to loading first viewport worth
}) => {
  useEffect(() => {
    // Only preload the first batch of images
    const imagesToPreload = images.slice(0, preloadThreshold);
    
    // Use Intersection Observer to lazy load the rest
    const preloadImage = (img: ImageProps) => {
      if (img.url) {
        const preloadImg = new window.Image();
        preloadImg.src = img.url;
      }
    };

    // Preload initial batch
    imagesToPreload.forEach(preloadImage);

    // Setup progressive loading for the rest
    const observer = new IntersectionObserver((entries) => {
      entries.forEach(entry => {
        if (entry.isIntersecting) {
          const index = Number(entry.target.getAttribute('data-index'));
          if (index < images.length) {
            preloadImage(images[index]);
          }
        }
      });
    }, {
      rootMargin: '50px 0px', // Start loading slightly before they come into view
      threshold: 0.1
    });

    // Add observers for future images
    document.querySelectorAll('[data-preload-trigger]').forEach(el => {
      observer.observe(el);
    });

    return () => observer.disconnect();
  }, [images, preloadThreshold]);

  return null;
};

export default PreloadImages;
