import Image from "next/image";
import { Pump } from "basehub/react-pump";
import { draftMode } from "next/headers";
import Gallery from "./components/gallery";
import { ImageProps } from "./utils/types";
import { Suspense } from "react";
import PreloadImages from "./components/PreloadImages";

export default async function Home() {
  const { isEnabled } = await draftMode();
  
  return (
    <Pump
      queries={[
        {
          openingParty: {
            items: {
              _title: true,
              media: {
                __typename: true,
                on_BlockImage: {
                  url: true,
                  alt: true,
                },
              },
              webMedia: {
                __typename: true,
                on_BlockImage: {
                  url: true,
                  alt: true,
                },
              },
            },
          },
          day1: {
            items: {
              _title: true,
              media: {
                __typename: true,
                on_BlockImage: {
                  url: true,
                  alt: true,
                },
              },
              webMedia: {
                __typename: true,
                on_BlockImage: {
                  url: true,
                  alt: true,
                },
              },
            },
          },
          day2: {
            items: {
              _title: true,
              media: {
                __typename: true,
                on_BlockImage: {
                  url: true,
                  alt: true,
                },
              },
              webMedia: {
                __typename: true,
                on_BlockImage: {
                  url: true,
                  alt: true,
                },
              },
            },
          },
          afterparty: {
            items: {
              _title: true,
              media: {
                __typename: true,
                on_BlockImage: {
                  url: true,
                  alt: true,
                },
              },
              webMedia: {
                __typename: true,
                on_BlockImage: {
                  url: true,
                  alt: true,
                },
              },
            },
          },
        },
      ]}
      next={{ revalidate: 30 }}
      draft={isEnabled}
    >
      {async ([data]) => {
        "use server";

        function mapImages(items: any[]): ImageProps[] {
          return items.map((image, i) => {
            const media = image?.media;
            return {
              id: i,
              url: media?.url ?? "",
              webUrl: image?.webMedia?.url ?? "",
              alt: media && "alt" in media ? media.alt ?? "" : "",
            };
          });
        }

        const openingParty: ImageProps[] = mapImages(data.openingParty.items);
        const day1: ImageProps[] = mapImages(data.day1.items);
        const day2: ImageProps[] = mapImages(data.day2.items);
        const afterparty: ImageProps[] = mapImages(data.afterparty.items);

        // Combine all images for preloading
        const allImages = [...openingParty, ...day1, ...day2, ...afterparty];

        return (
          <>
            <PreloadImages images={allImages} />
            <main className="mx-auto max-w-[1960px] p-4">
              <Suspense>
                <Gallery
                  collections={{
                    "Opening Party": openingParty,
                    "Day 1": day1,
                    "Day 2": day2,
                    Afterparty: afterparty,
                  }}
                />
              </Suspense>
            </main>
          </>
        );
      }}
    </Pump>
  );
}
