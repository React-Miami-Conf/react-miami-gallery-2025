export type ImageProps = {
    id: number
    url: string
    alt: string
}

export interface SharedModalProps {
    index: number
    images?: ImageProps[]
    currentPhoto?: ImageProps
    changePhotoId: (newVal: number) => void
    closeModal: () => void
    navigation: boolean
    direction?: number
  }