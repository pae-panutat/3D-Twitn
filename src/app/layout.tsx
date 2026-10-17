import type {Metadata} from 'next';
import './farm.css';
export const metadata: Metadata = {
  title: 'Farm Twin · Smart Pig Farm',
  description: 'โรงเรือนฟาร์มหมู 3D · ติดตามรายตัวและควบคุมการระบายอากาศจำลอง',
};
export default function RootLayout({children}: {children: React.ReactNode}) {
  return (
    <html lang="th">
      <body>{children}</body>
    </html>
  );
}
