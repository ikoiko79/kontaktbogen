import Link from 'next/link';
import { brand } from '@/lib/brand';

export function Logo({ href = '/' }: { href?: string }) {
  return (
    <Link href={href} className="logo">
      <i aria-hidden />
      {brand.name}
    </Link>
  );
}
