import type {Metadata} from 'next';
import '../../dist/city.css';
import '../../dist/typography.css';
import '../../dist/drawer.css';
import './migration.css';
export const metadata: Metadata = {
  title: 'Energy Building · เมืองที่ไม่หยุดเคลื่อนไหว',
  description: 'สำรวจเมือง รถไฟ และสถานีในโลก 3D จำลอง',
};
export default function RootLayout({children}: {children: React.ReactNode}) {
  return (
    <html lang="th">
      <body>{children}</body>
    </html>
  );
}
