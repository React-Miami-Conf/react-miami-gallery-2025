'use client'

import {useEffect, useRef, useState} from 'react'
import { useSearchParams } from 'next/navigation'
import Image from 'next/image'
import Link from 'next/link'
import { ImageProps } from '../utils/types'
import Modal from './modal'
import { useLastViewedPhoto } from '../utils/useLastViewedPhoto'

export default function Gallery({ images }: { images: any }) {
    const searchParams = useSearchParams()
    const photoId = searchParams.get('photoId')
    const [lastViewedPhoto, setLastViewedPhoto] = useLastViewedPhoto()

    const lastViewedPhotoRef = useRef<HTMLAnchorElement>(null)

    useEffect(() => {
      // This effect keeps track of the last viewed photo in the modal to keep the index page in sync when the user navigates back
      if (lastViewedPhoto && !photoId) {
        lastViewedPhotoRef.current?.scrollIntoView({ block: 'center' })
        setLastViewedPhoto(null)
      }
    }, [photoId, lastViewedPhoto, setLastViewedPhoto])

    return (
      <div>
      {photoId && (
        <Modal
          images={images}
          onClose={() => {
            setLastViewedPhoto(photoId)
          }}
        />
      )}
      <div className="columns-1 gap-4 sm:columns-2 xl:columns-3 2xl:columns-4">
        <div className="after:content relative mb-5 flex h-[629px] flex-col items-center justify-end gap-4 overflow-hidden rounded-lg bg-white/10 px-6 pb-16 pt-64 text-center text-white shadow-highlight after:pointer-events-none after:absolute after:inset-0 after:rounded-lg after:shadow-highlight lg:pt-0">
          <div className="absolute inset-0 flex items-center justify-center opacity-20">
            {/* <span className="flex max-h-full max-w-full items-center justify-center">
              <Bridge />
            </span> */}
            <span className="absolute left-0 right-0 bottom-0 h-[400px] bg-gradient-to-b from-black/0 via-black to-black"></span>
          </div>
          {/* <Logo /> */}
          <h1 className="mt-8 mb-4 text-base font-bold uppercase tracking-widest">
            2024 Event Photos
          </h1>
          <p className="max-w-[40ch] text-white/75 sm:max-w-[32ch]">
            A 2 day celebration in Miami of all things React featuring expert speakers, the latest web development, and unparalleled networking!
          </p>
          <a
            className="pointer z-10 mt-6 rounded-lg border border-white bg-white px-3 py-2 text-sm font-semibold text-black transition hover:bg-white/10 hover:text-white md:mt-4"
            href="https://www.reactmiami.com/"
            target="_blank"
            rel="noreferrer"
          >
            Learn More
          </a>
        </div>
        {images.map(({id, url, alt}: any) => (
          <Link
            key={id}
            href={`/?photoId=${id}`}
            // as={`/p/${_title}`}
            ref={Number(id) === Number(lastViewedPhoto) ? lastViewedPhotoRef : null}
            shallow
            className="after:content group relative mb-5 block w-full cursor-zoom-in after:pointer-events-none after:absolute after:inset-0 after:rounded-lg after:shadow-highlight"
          >
            <Image
              alt={alt}
              className="transform rounded-lg brightness-90 transition will-change-auto group-hover:brightness-110"
              style={{ transform: 'translate3d(0, 0, 0)' }}
              // placeholder="blur"
              // blurDataURL={blurDataUrl}
              src={url}
              width={720}
              height={480}
              sizes="(max-width: 640px) 100vw,
                (max-width: 1280px) 50vw,
                (max-width: 1536px) 33vw,
                25vw"
            />
          </Link>
        ))}
      </div>
      </div>
    )
}