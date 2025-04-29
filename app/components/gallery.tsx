"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import { useSearchParams } from "next/navigation";
import Image from "next/image";
import Link from "next/link";
import { ImageProps } from "../utils/types";
import Modal from "./modal";
import { useLastViewedPhoto } from "../utils/useLastViewedPhoto";
import Leaves from "./Icons/Leaves";
import Logo from "./Icons/Logo";
import { AnimatePresence, motion } from "framer-motion";

// Configuration constants for infinite scroll
const INFINITE_SCROLL_CONFIG = {
  // Number of images to show initially
  INITIAL_IMAGES_COUNT: 12,
  // Number of images to load each time
  IMAGES_PER_BATCH: 12,
  // Root margin in pixels (how far from viewport to trigger loading)
  ROOT_MARGIN_PX: 800,
  // Trigger threshold (0-1), lower values trigger earlier
  THRESHOLD: 0.01,
  // Number of columns for different breakpoints
  COLUMNS: {
    sm: 1,
    md: 2,
    lg: 3,
    xl: 4
  }
};

type GalleryProps = {
  collections: {
    [key: string]: ImageProps[];
  };
};

export default function Gallery({ collections }: GalleryProps) {
  const collectionNames = Object.keys(collections);
  const [selectedTab, setSelectedTab] = useState(collectionNames[0]);
  const [isLoading, setIsLoading] = useState(false);
  const [loadedImagesCount, setLoadedImagesCount] = useState(0);
  const [scrollPercentage, setScrollPercentage] = useState(0);
  const [pixelsFromBottom, setPixelsFromBottom] = useState(0);
  
  // Maintain visible images count per tab so scroll position persists
  const initialVisibleCounts = collectionNames.reduce((acc, name) => {
    acc[name] = INFINITE_SCROLL_CONFIG.INITIAL_IMAGES_COUNT;
    return acc;
  }, {} as Record<string, number>);
  const [visibleImagesCounts, setVisibleImagesCounts] = useState<Record<string, number>>(initialVisibleCounts);
  const visibleImagesCount = visibleImagesCounts[selectedTab];

  const [prefetchedTabs, setPrefetchedTabs] = useState<Set<string>>(new Set([selectedTab]));
  const observerRef = useRef<IntersectionObserver | null>(null);
  const loadMoreTriggerRef = useRef<HTMLDivElement>(null);
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  
  // Get all images for current tab
  const allImages = collections[selectedTab] || [];
  
  // Get visible images based on current load count
  const visibleImages = allImages.slice(0, visibleImagesCount);

  const searchParams = useSearchParams();
  const photoId = searchParams.get("photoId");
  const [lastViewedPhoto, setLastViewedPhoto] = useLastViewedPhoto();

  const lastViewedPhotoRef = useRef<HTMLAnchorElement>(null);

  // Distribute images into columns
  const distributeImagesIntoColumns = (images: ImageProps[], numColumns: number) => {
    const columns: ImageProps[][] = Array.from({ length: numColumns }, () => []);
    const columnHeights = new Array(numColumns).fill(0);
    
    // Function to get a consistent height estimate from an image URL or ID
    const getEstimatedHeightFromImage = (image: ImageProps): number => {
      // If we have actual dimensions, use them
      if (image.width && image.height) {
        const aspectRatio = image.width / image.height;
        return 1 / aspectRatio;
      }
      
      // Otherwise, generate a pseudo-random but consistent height based on the image ID
      // This ensures the same image always gets the same height estimate
      const imageId = image.id.toString();
      const seed = imageId.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0);
      
      // Generate a height between 0.7 and 1.5 (portrait to landscape)
      // This creates a realistic distribution of image aspect ratios
      return 0.7 + (seed % 80) / 100; // Height values between 0.7 and 1.5
    };
    
    // Distribute images to the shortest column each time
    images.forEach((image) => {
      // Find the column with the smallest height
      const shortestColumnIndex = columnHeights.indexOf(Math.min(...columnHeights));
      
      // Add the image to the shortest column
      columns[shortestColumnIndex].push(image);
      
      // Update the column height with our consistent estimate plus margin
      const estimatedHeight = getEstimatedHeightFromImage(image);
      columnHeights[shortestColumnIndex] += estimatedHeight + 0.25; // 0.25 for margin
    });
    
    return columns;
  };

  // Prefetch images for a specific tab
  const prefetchTabImages = useCallback((tabName: string) => {
    if (prefetchedTabs.has(tabName) || !collections[tabName]) return;
    
    // Mark this tab as prefetched
    setPrefetchedTabs(prev => new Set([...prev, tabName]));
    
    // Prefetch all visible images for the tab
    const imagesToPrefetch = collections[tabName].slice(0, visibleImagesCounts[tabName] || INFINITE_SCROLL_CONFIG.INITIAL_IMAGES_COUNT);
    imagesToPrefetch.forEach(({ webUrl }) => {
      const img = new window.Image();
      img.src = webUrl;
      // Also prefetch a smaller version for blur placeholder
      const smallImg = new window.Image();
      smallImg.src = webUrl + '?w=40&q=75';
    });
  }, [collections, prefetchedTabs]);

  // Load more images when scrolling
  const setupIntersectionObserver = useCallback(() => {
    if (observerRef.current) {
      observerRef.current.disconnect();
    }

    observerRef.current = new IntersectionObserver(
      (entries) => {
        const [entry] = entries;
        if (entry?.isIntersecting && visibleImagesCounts[selectedTab] < allImages.length) {
          // Add more images when scrolling to the bottom for the current tab
          setVisibleImagesCounts(prev => ({
            ...prev,
            [selectedTab]: Math.min(prev[selectedTab] + INFINITE_SCROLL_CONFIG.IMAGES_PER_BATCH, allImages.length),
          }));
        }
      },
      {
        root: null,
        rootMargin: `${INFINITE_SCROLL_CONFIG.ROOT_MARGIN_PX}px`,
        threshold: INFINITE_SCROLL_CONFIG.THRESHOLD,
      }
    );

    if (loadMoreTriggerRef.current) {
      observerRef.current.observe(loadMoreTriggerRef.current);
    }
  }, [visibleImagesCounts, selectedTab, allImages.length]);

  // Handle tab change
  const handleTabChange = (tabName: string) => {
    if (tabName !== selectedTab) {
      setIsLoading(true);
      setLoadedImagesCount(0);
      setSelectedTab(tabName);
      // We'll turn off loading once first batch is loaded
      if (prefetchedTabs.has(tabName)) {
        setTimeout(() => setIsLoading(false), 300);
      }
    }
  };

  // Handle image loaded event
  const handleImageLoaded = () => {
    setLoadedImagesCount(prev => {
      const newCount = prev + 1;
      // Turn off loading when first visible batch is loaded
      if (newCount >= Math.min(INFINITE_SCROLL_CONFIG.INITIAL_IMAGES_COUNT, 6) && isLoading) {
        setIsLoading(false);
      }
      return newCount;
    });
  };

  // Set up intersection observer for infinite scroll
  useEffect(() => {
    setupIntersectionObserver();
    
    return () => {
      observerRef.current?.disconnect();
    };
  }, [setupIntersectionObserver]);

  // Handle last viewed photo scrolling
  useEffect(() => {
    if (lastViewedPhoto && !photoId) {
      lastViewedPhotoRef.current?.scrollIntoView({ block: "center" });
      setLastViewedPhoto(null);
    }
  }, [photoId, lastViewedPhoto, setLastViewedPhoto]);

  // Track scroll percentage and distance from bottom
  useEffect(() => {
    const handleScroll = () => {
      if (!scrollContainerRef.current) return;
      
      const windowHeight = window.innerHeight;
      const documentHeight = document.documentElement.scrollHeight;
      const scrollTop = window.scrollY;
      
      // Calculate scroll percentage
      const scrolled = Math.min(
        Math.round((scrollTop / (documentHeight - windowHeight)) * 100),
        100
      );
      
      // Calculate pixels from bottom
      const bottom = documentHeight - (scrollTop + windowHeight);
      
      setScrollPercentage(scrolled);
      setPixelsFromBottom(Math.max(0, Math.round(bottom)));
    };

    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  // Add effect to prefetch adjacent tabs
  useEffect(() => {
    const currentIndex = collectionNames.indexOf(selectedTab);
    
    // Prefetch next tab
    if (currentIndex < collectionNames.length - 1) {
      prefetchTabImages(collectionNames[currentIndex + 1]);
    }
    
    // Prefetch previous tab
    if (currentIndex > 0) {
      prefetchTabImages(collectionNames[currentIndex - 1]);
    }
  }, [selectedTab, collectionNames, prefetchTabImages]);

  // Function to render a gallery image
  const renderGalleryImage = (image: ImageProps, columnIndex: number, imageIndex: number) => {
    const { id, webUrl, alt } = image;
    
    const isPriority = columnIndex < 2 && imageIndex === 0;
    
    return (
      <div 
        key={`${selectedTab}-${id}-col${columnIndex}`}
        className="mb-4 w-full"
      >
        <Link
          href={`/?photoId=${id}`}
          ref={
            Number(id) === Number(lastViewedPhoto) ? lastViewedPhotoRef : null
          }
          shallow
          className="after:content group relative block w-full cursor-zoom-in after:pointer-events-none after:absolute after:inset-0 after:rounded-lg after:shadow-highlight"
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
            loading={isPriority ? undefined : "lazy"}
            onLoad={handleImageLoaded}
            priority={isPriority}
            placeholder="blur"
            blurDataURL={`data:image/svg+xml;base64,${Buffer.from(
              '<svg width="400" height="300" xmlns="http://www.w3.org/2000/svg"><rect width="400" height="300" fill="#2A2A2A"/></svg>'
            ).toString('base64')}`}
            quality={75}
          />
        </Link>
      </div>
    );
  };

  return (
    <div ref={scrollContainerRef}>
      {/* Scroll Percentage Overlay (Dev Only) */}
      {/* <div className="fixed bottom-4 right-4 bg-black/70 text-white px-4 py-3 rounded-md font-mono text-sm z-50 flex flex-col">
        <div>Scroll: {scrollPercentage}%</div>
        <div>Bottom: {pixelsFromBottom}px</div>
        <div>Config: {INFINITE_SCROLL_CONFIG.ROOT_MARGIN_PX}px trigger</div>
        <div>Images: {visibleImagesCount} / {allImages.length}</div>
        <div className="w-full bg-gray-700 h-2 mt-1 rounded-full overflow-hidden">
          <div 
            className="bg-white h-full rounded-full" 
            style={{ width: `${scrollPercentage}%` }}
          />
        </div>
      </div> */}

      {photoId && (
        <Modal
          images={allImages}
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
        
        {/* Tabs */}
        <div className="flex gap-2 mt-4 z-10 justify-center">
          {collectionNames.map((name) => (
            <button
              key={name}
              className={`px-4 py-2 rounded-lg font-semibold text-sm transition border relative overflow-hidden ${
                selectedTab === name
                  ? "bg-white text-black border-white"
                  : "bg-transparent text-white border-white/30 hover:bg-white/10"
              }`}
              onClick={() => handleTabChange(name)}
              onMouseEnter={() => prefetchTabImages(name)}
              disabled={isLoading && selectedTab === name}
            >
              {name}
              {selectedTab === name && (
                <motion.div 
                  className="absolute bottom-0 left-0 h-0.5 bg-white"
                  layoutId="activeTab"
                  initial={{ width: 0 }}
                  animate={{ width: '100%' }}
                  transition={{ duration: 0.3 }}
                />
              )}
            </button>
          ))}
        </div>
      </div>
      
      {/* Gallery with column-based layout */}
      <div className="relative min-h-[200px]">
        <AnimatePresence mode="wait">
          <motion.div
            key={selectedTab}
            initial={{ opacity: 0 }}
            animate={{ opacity: isLoading ? 0.7 : 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.3 }}
            className="w-full"
          >
            {/* Columnar gallery container - pure flexbox approach */}
            <div className="flex flex-wrap -mx-2">
              {/* Mobile: 1 column */}
              <div className="w-full px-2 block sm:hidden">
                {visibleImages.map((image, index) => (
                  renderGalleryImage(image, 0, index)
                ))}
              </div>
              
              {/* Tablet: 2 columns */}
              <div className="hidden sm:flex xl:hidden w-full">
                {distributeImagesIntoColumns(visibleImages, 2).map((columnImages, colIndex) => (
                  <div key={`col-md-${colIndex}`} className="w-1/2 px-2">
                    {columnImages.map((image, imgIndex) => (
                      renderGalleryImage(image, colIndex, imgIndex)
                    ))}
                  </div>
                ))}
              </div>
              
              {/* Desktop: 3 columns */}
              <div className="hidden xl:flex 2xl:hidden w-full">
                {distributeImagesIntoColumns(visibleImages, 3).map((columnImages, colIndex) => (
                  <div key={`col-lg-${colIndex}`} className="w-1/3 px-2">
                    {columnImages.map((image, imgIndex) => (
                      renderGalleryImage(image, colIndex, imgIndex)
                    ))}
                  </div>
                ))}
              </div>
              
              {/* Large Desktop: 4 columns */}
              <div className="hidden 2xl:flex w-full">
                {distributeImagesIntoColumns(visibleImages, 4).map((columnImages, colIndex) => (
                  <div key={`col-xl-${colIndex}`} className="w-1/4 px-2">
                    {columnImages.map((image, imgIndex) => (
                      renderGalleryImage(image, colIndex, imgIndex)
                    ))}
                  </div>
                ))}
              </div>
            </div>
            
            {/* Loading more trigger - invisible element to detect when user scrolls near bottom */}
            {visibleImagesCount < allImages.length && (
              <div 
                ref={loadMoreTriggerRef} 
                className="w-full h-60 opacity-0 my-8"
                aria-hidden="true"
              >
                {/* Invisible loading trigger */}
              </div>
            )}
          </motion.div>
        </AnimatePresence>
        
        {/* Initial loading indicator */}
        {isLoading && (
          <motion.div 
            className="absolute inset-0 flex items-center justify-center bg-black/30 backdrop-blur-[2px] z-10 rounded-lg"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.3 }}
          >
            <div className="flex flex-col items-center space-y-4">
              <div className="w-12 h-12 border-t-2 border-b-2 border-white rounded-full animate-spin"></div>
              <p className="text-white font-medium">Loading gallery...</p>
            </div>
          </motion.div>
        )}
      </div>
    </div>
  );
}
