import Image from "next/image";
import { Pump } from 'basehub/react-pump'
import { draftMode } from 'next/headers'
import Gallery from "./components/gallery";
import { ImageProps } from "./utils/types";

export default function Home() {
  return (
    <Pump
      queries={[{
        images: {
          items: {
            _title: true,
            image: {
              url: true,
              alt: true,
            }
          }
        } 
      }]}
      next={{ revalidate: 30 }}
      draft={draftMode().isEnabled}
    >
      {async ([data]) => {
        'use server'
        
        let reducedResults: ImageProps[] = []
        const newImages = data.images.items

        let i = 0

        for (let image of newImages) {
          reducedResults.push({
            id: i,
            url: image?.image?.url || '',
            alt: image?.image?.alt || '',
          })
          i++
        }

        return (
          <main className="mx-auto max-w-[1960px] p-4">
            <Gallery images={reducedResults} />
          </main>
        )
      }}
    </Pump>
  );
}
