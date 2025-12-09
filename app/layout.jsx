import "./globals.css";

export const metadata = {
  title: "Tritorc Image Optimizer",
  description: "Internal image optimization tool for Tritorc team."
};

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body className="min-h-screen">{children}</body>
    </html>
  );
}
