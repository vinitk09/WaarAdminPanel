import localFont from "next/font/local";
import "./admin.css";

// Bundle fonts locally so development and builds do not need Google Fonts.
const geistSans = localFont({
  src: "./fonts/geist-latin.woff2",
  variable: "--font-geist-sans",
  weight: "100 900",
  display: "swap",
});

const geistMono = localFont({
  src: "./fonts/geist-mono-latin.woff2",
  variable: "--font-geist-mono",
  weight: "100 900",
  display: "swap",
});

export const metadata = {
  title: "WAARR | Academy Administration",
  description: "The WAARR academy workspace for courses, learners, enquiries and website content.",
};

export default function RootLayout({ children }) {
  return (
    <html
      lang="en"
      // Browser extensions may add attributes to the document before hydration.
      suppressHydrationWarning
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col">{children}</body>
    </html>
  );
}
