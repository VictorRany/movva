import Image from "next/image";
import Link from "next/link";

export default function Header({ right }: { right?: React.ReactNode }) {
  return (
    <header className="mx-auto flex max-w-6xl items-center justify-between gap-2 px-4 py-4">
      <Link href="/" className="flex items-center gap-2 font-bold tracking-wide">
        <Image src="/logo.jpg" alt="Movva" width={36} height={36} className="rounded-lg" />
        <span className="hidden sm:inline">MOVVA</span>
      </Link>
      <div className="flex min-w-0 items-center gap-2">{right}</div>
    </header>
  );
}
