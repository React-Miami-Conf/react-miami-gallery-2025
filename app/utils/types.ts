export type ImageProps = {
    id: number
    url: string
    webUrl: string
    alt: string
    width?: number
    height?: number
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