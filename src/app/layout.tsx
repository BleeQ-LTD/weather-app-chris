import type { Metadata } from "next";
import { Bricolage_Grotesque } from "next/font/google";
import { AuthProvider } from "@/components/AuthProvider";
import { ProfileProvider } from "@/components/ProfileProvider";
import SiteHeader from "@/components/SiteHeader";
import SiteFooter from "@/components/SiteFooter";
import "./globals.css";

const bricolage = Bricolage_Grotesque({
  variable: "--font-bricolage",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Weather",
  description: "Current conditions and a 3-day forecast for any city.",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="en" className={`${bricolage.variable} h-full antialiased`}>
      {/* A column that fills the screen, so the footer sits at the bottom even on short pages */}
      <body className="flex min-h-full flex-col font-sans">
        <AuthProvider>
          <ProfileProvider>
            <SiteHeader />
            <div className="flex-1">{children}</div>
            <SiteFooter />
          </ProfileProvider>
        </AuthProvider>
      </body>
    </html>
  );
}