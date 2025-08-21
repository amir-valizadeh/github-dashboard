import Image from "next/image"

interface ImageProps {
  src: string
  alt: string
  width: number
  height: number
}

export default function CustomImage({ src, alt, width, height }: ImageProps) {
  return <Image src={src} alt={alt} width={width} height={height} className="rounded-md" />
}