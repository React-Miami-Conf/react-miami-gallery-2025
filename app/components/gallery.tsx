"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import { useSearchParams } from "next/navigation";
import { useRouter } from "next/navigation";
import Image from "next/image";
import { ImageProps } from "../utils/types";
import Modal from "./modal";
import { useLastViewedPhoto } from "../utils/useLastViewedPhoto";
import Leaves from "./Icons/Leaves";
import Logo from "./Icons/Logo";
import { AnimatePresence, motion } from "framer-motion";
import { FaArrowUp } from "react-icons/fa";

// Wrapper component for fade-in animation
type FadeInImageWrapperProps = {
  children: React.ReactNode;
  delay?: number;
  isNewlyLoaded?: boolean;
};

const FadeInImageWrapper = ({ children, delay = 0, isNewlyLoaded = false }: FadeInImageWrapperProps) => {
  return (
    <motion.div
      initial={isNewlyLoaded ? { opacity: 0, y: 20 } : { opacity: 1, y: 0 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, delay }}
    >
      {children}
    </motion.div>
  );
};

// Configuration constants for infinite scroll
const INFINITE_SCROLL_CONFIG = {
  // Number of images to show initially
  INITIAL_IMAGES_COUNT: 12,
  // Number of images to load each time
  IMAGES_PER_BATCH: 12,
  // Root margin in pixels (how far from viewport to trigger loading)
  ROOT_MARGIN_PX: 1200,
  // Trigger threshold (0-1), lower values trigger earlier
  THRESHOLD: 0.01,
  // Number of columns for different breakpoints
  COLUMNS: {
    sm: 1,
    md: 2,
    lg: 3,
    xl: 4
  },
  // Enable debug mode to show scroll information
  DEBUG_MODE: false
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
  const [showScrollTop, setShowScrollTop] = useState(false);
  
  // Add router for handling modal without page reload
  const router = useRouter();
  
  // Maintain visible images count per tab so scroll position persists
  const initialVisibleCounts = collectionNames.reduce((acc, name) => {
    acc[name] = INFINITE_SCROLL_CONFIG.INITIAL_IMAGES_COUNT;
    return acc;
  }, {} as Record<string, number>);
  const [visibleImagesCounts, setVisibleImagesCounts] = useState<Record<string, number>>(initialVisibleCounts);
  const visibleImagesCount = visibleImagesCounts[selectedTab];

  // Track if infinite scroll is enabled per tab
  const [infiniteScrollEnabled, setInfiniteScrollEnabled] = useState<Record<string, boolean>>(
    collectionNames.reduce((acc, name) => {
      acc[name] = true;
      return acc;
    }, {} as Record<string, boolean>)
  );

  const [prefetchedTabs, setPrefetchedTabs] = useState<Set<string>>(new Set([selectedTab]));
  const observerRef = useRef<IntersectionObserver | null>(null);
  const loadMoreTriggerRef = useRef<HTMLDivElement>(null);
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  
  // Get all images for current tab
  const allImages = collections[selectedTab] || [];
  
  // Get visible images based on current load count
  const visibleImages = allImages.slice(0, visibleImagesCount);

  // We need to keep searchParams for compatibility with modal
  const searchParams = useSearchParams();
  const photoId = searchParams.get("photoId");
  const [lastViewedPhoto, setLastViewedPhoto] = useLastViewedPhoto();

  // Need to update the ref to be HTMLDivElement
  const lastViewedPhotoRef = useRef<HTMLDivElement>(null);

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

    // Don't set up observer if infinite scroll is disabled for this tab
    if (!infiniteScrollEnabled[selectedTab]) {
      return;
    }

    observerRef.current = new IntersectionObserver(
      (entries) => {
        const [entry] = entries;
        if (entry?.isIntersecting && visibleImagesCounts[selectedTab] < allImages.length) {
          console.log(`[IntersectionObserver] Loading more images for ${selectedTab}`);
          
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
      console.log(`[Observer] Set up for ${selectedTab} with ${allImages.length} total images and ${visibleImagesCount} visible`);
    }
  }, [visibleImagesCounts, selectedTab, allImages.length, infiniteScrollEnabled]);

  // Handle tab change
  const handleTabChange = (tabName: string) => {
    if (tabName !== selectedTab) {
      // Disconnect current observer before changing tabs
      if (observerRef.current) {
        observerRef.current.disconnect();
        observerRef.current = null;
      }
      
      setIsLoading(true);
      setLoadedImagesCount(0);
      
      // Change the tab before scrolling to avoid visual jumps
      setSelectedTab(tabName);

      // Reset scroll position
      window.scrollTo(0, 0);
      
      // Make sure the infinite scroll is enabled for this tab
      setInfiniteScrollEnabled(prev => ({
        ...prev,
        [tabName]: true
      }));
      
      // Setup tab with correct initial images count if needed
      if (!visibleImagesCounts[tabName] || visibleImagesCounts[tabName] === 0) {
        setVisibleImagesCounts(prev => ({
          ...prev,
          [tabName]: INFINITE_SCROLL_CONFIG.INITIAL_IMAGES_COUNT
        }));
      }

      // We'll turn off loading once first batch is loaded
      if (prefetchedTabs.has(tabName)) {
        setTimeout(() => setIsLoading(false), 300);
      }
      
      // Force observer reset on next tick after DOM updates
      setTimeout(() => {
        setupIntersectionObserver();
      }, 100);
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
    // Always disconnect any existing observer before setting up a new one
    if (observerRef.current) {
      observerRef.current.disconnect();
      observerRef.current = null;
    }
    
    // Small delay to ensure DOM has updated
    const timer = setTimeout(() => {
      setupIntersectionObserver();
    }, 100);
    
    return () => {
      clearTimeout(timer);
      observerRef.current?.disconnect();
    };
  }, [setupIntersectionObserver, selectedTab]);

  // Handle last viewed photo scrolling
  useEffect(() => {
    if (lastViewedPhoto && !photoId) {
      lastViewedPhotoRef.current?.scrollIntoView({ block: "center" });
      setLastViewedPhoto(null);
    }
  }, [photoId, lastViewedPhoto, setLastViewedPhoto]);

  // Handle scroll events to detect when we're near the bottom
  useEffect(() => {
    const handleScroll = () => {
      if (!scrollContainerRef.current || !infiniteScrollEnabled[selectedTab]) return;
      
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
      
      // Show/hide scroll to top button
      setShowScrollTop(scrollTop > 500);
      
      // Backup method: If we're close to the bottom and the observer hasn't triggered,
      // manually load more images
      if (bottom < INFINITE_SCROLL_CONFIG.ROOT_MARGIN_PX / 2 && 
          visibleImagesCounts[selectedTab] < collections[selectedTab]?.length) {
        console.log(`[Scroll Backup] Near bottom, loading more images for ${selectedTab}`);
        setVisibleImagesCounts(prev => ({
          ...prev,
          [selectedTab]: Math.min(
            prev[selectedTab] + INFINITE_SCROLL_CONFIG.IMAGES_PER_BATCH, 
            collections[selectedTab]?.length || 0
          ),
        }));
      }
    };

    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, [selectedTab, visibleImagesCounts, collections, infiniteScrollEnabled]);

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

  // Jump to top function
  const scrollToTop = () => {
    window.scrollTo({
      top: 0,
      behavior: 'smooth'
    });
  };

  // Function to render a gallery image
  const renderGalleryImage = (image: ImageProps, columnIndex: number, imageIndex: number) => {
    const { id, webUrl, alt } = image;
    
    const isPriority = columnIndex < 2 && imageIndex === 0;
    
    // Determine if this is a newly loaded image (for animation)
    // Images beyond the initial batch will get the fade-in animation
    const isNewlyLoaded = 
      // Either it's part of infinite scroll loading
      (visibleImagesCount > INFINITE_SCROLL_CONFIG.INITIAL_IMAGES_COUNT && 
        imageIndex + (columnIndex * Math.ceil(visibleImagesCount / 4)) >= INFINITE_SCROLL_CONFIG.INITIAL_IMAGES_COUNT) ||
      // Or it's part of the initial loading of a new tab
      (loadedImagesCount < INFINITE_SCROLL_CONFIG.INITIAL_IMAGES_COUNT && !isLoading);
    
    // Calculate staggered delay - different columns start animating at different times
    // For a natural cascade effect
    const staggerDelay = isNewlyLoaded ? 0.05 * (imageIndex % 8) + (0.03 * columnIndex) : 0;
    
    return (
      <div key={`${selectedTab}-${id}-col${columnIndex}`} className="mb-4 w-full">
        <FadeInImageWrapper 
          isNewlyLoaded={isNewlyLoaded}
          delay={staggerDelay}
        >
          <div
            onClick={() => {
              // Use router to update URL without page reload
              router.push(`?photoId=${id}`, { scroll: false });
            }}
            ref={
              Number(id) === Number(lastViewedPhoto) ? lastViewedPhotoRef : null
            }
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
          </div>
        </FadeInImageWrapper>
      </div>
    );
  };

  return (
    <div ref={scrollContainerRef}>
      {/* Scroll to top button - Bottom left position */}
      <AnimatePresence>
        {showScrollTop && (
          <motion.button
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 20 }}
            transition={{ duration: 0.3 }}
            onClick={scrollToTop}
            className="fixed bottom-6 left-6 z-50 bg-black/70 hover:bg-black/90 text-white p-3 rounded-full shadow-lg"
            aria-label="Scroll to top"
          >
            <FaArrowUp className="text-lg" />
          </motion.button>
        )}
      </AnimatePresence>

      {/* Scroll Percentage Overlay (Debug Mode) */}
      {INFINITE_SCROLL_CONFIG.DEBUG_MODE && (
        <div className="fixed bottom-4 right-4 bg-black/70 text-white px-4 py-3 rounded-md font-mono text-sm z-50 flex flex-col">
          <div>Scroll: {scrollPercentage}%</div>
          <div>Bottom: {pixelsFromBottom}px</div>
          <div>Config: {INFINITE_SCROLL_CONFIG.ROOT_MARGIN_PX}px trigger</div>
          <div>Images: {visibleImagesCount} / {allImages.length}</div>
          <div>Tab: {selectedTab}</div>
          <div>InfScroll: {infiniteScrollEnabled[selectedTab] ? 'ON' : 'OFF'}</div>
          <div className="w-full bg-gray-700 h-2 mt-1 rounded-full overflow-hidden">
            <div 
              className="bg-white h-full rounded-full" 
              style={{ width: `${scrollPercentage}%` }}
            />
          </div>
        </div>
      )}

      {photoId && (
        <Modal
          images={allImages}
          onClose={() => {
            // @ts-ignore - This is needed for the existing Modal component
            setLastViewedPhoto(photoId);
          }}
        />
      )}

      {/* Header Card - Improved for better mobile display */}
      <div className="after:content relative mb-6 flex h-auto min-h-[480px] sm:min-h-[420px] flex-col items-center justify-between overflow-hidden rounded-lg bg-white/10 px-4 sm:px-6 pb-4 pt-10 sm:pt-20 text-center text-white shadow-highlight after:pointer-events-none after:absolute after:inset-0 after:rounded-lg after:shadow-highlight">
        <div className="absolute inset-0 flex items-center justify-center opacity-20">
          <span className="flex max-h-full max-w-full items-center justify-center">
            <Leaves />
          </span>
          <span className="absolute left-0 right-0 bottom-0 h-[240px] bg-gradient-to-b from-black/0 via-black to-black"></span>
        </div>
        
        {/* Top section with logo and title */}
        <div className="flex flex-col items-center z-10 pt-8 sm:pt-4">
          <Logo />
          <h1 className="mt-6 mb-4 text-xl sm:text-lg font-bold uppercase tracking-widest">
            2025 Event Photos
          </h1>
        </div>
        
        {/* Tabs - Modified to stack on mobile with better spacing */}
        <div className="flex flex-col gap-3 z-10 justify-center w-full max-w-md mx-auto mb-4 sm:mb-8">
          <div className="grid grid-cols-1 sm:grid-cols-4 gap-3 w-full">
            {collectionNames.map((name) => (
              <button
                key={name}
                className={`px-4 py-3 rounded-lg font-semibold text-sm transition border relative overflow-hidden w-full ${
                  selectedTab === name
                    ? "bg-white text-black border-white shadow-md"
                    : "bg-black/30 text-white border-white/30 hover:bg-white/10"
                }`}
                onClick={() => handleTabChange(name)}
                onMouseEnter={() => prefetchTabImages(name)}
                disabled={isLoading && selectedTab === name}
              >
                <div className="flex flex-col items-center">
                  <span className="font-medium">{name}</span>
                  <span className="text-xs mt-1 opacity-70">
                    {collections[name]?.length || 0} photos
                  </span>
                </div>
                {selectedTab === name && (
                  <motion.div 
                    className="absolute bottom-0 left-0 h-1 bg-white"
                    layoutId="activeTab"
                    initial={{ width: 0 }}
                    animate={{ width: '100%' }}
                    transition={{ duration: 0.3 }}
                  />
                )}
              </button>
            ))}
          </div>
          
          {/* Loading Progress */}
          {/* {isLoading && (
            <div className="flex justify-center">
              <span className="text-sm text-white/70">
                Loading {loadedImagesCount} of {visibleImagesCount} images...
              </span>
            </div>
          )} */}
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
            {visibleImagesCount < allImages.length && infiniteScrollEnabled[selectedTab] && (
              <div 
                ref={loadMoreTriggerRef} 
                className="w-full h-60 opacity-0 my-8"
                aria-hidden="true"
                id={`load-more-trigger-${selectedTab}`}
              >
                {/* Invisible loading trigger */}
              </div>
            )}

            {/* Load More button as fallback */}
            {visibleImagesCount < allImages.length && (
              <div className="w-full flex justify-center my-8">
                <FadeInImageWrapper>
                  <motion.button
                    onClick={() => {
                      setVisibleImagesCounts(prev => ({
                        ...prev,
                        [selectedTab]: Math.min(
                          prev[selectedTab] + INFINITE_SCROLL_CONFIG.IMAGES_PER_BATCH * 2, 
                          allImages.length
                        ),
                      }));
                    }}
                    className="px-6 py-2 bg-white/10 hover:bg-white/20 text-white rounded-lg transition"
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                  >
                    Load More ({allImages.length - visibleImagesCount} remaining)
                  </motion.button>
                </FadeInImageWrapper>
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
