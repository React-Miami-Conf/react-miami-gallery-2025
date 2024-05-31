import Image from "next/image";

export default function Leaves() {
  return (
    <Image src="/leaves.png" alt="Leaves" height="704" width="620" priority={true} />
  )
}