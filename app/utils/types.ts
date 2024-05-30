/*export type Image = {
    url: string;
    alt: string;
}

export type ImageProps = {
    title: string;
    image: Image;
}*/

export interface SharedModalProps {
    index: number
    images?: any
    currentPhoto?: any
    changePhotoId: (newVal: number) => void
    closeModal: () => void
    navigation: boolean
    direction?: number
  }