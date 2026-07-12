export { auth as middleware } from "./auth";

export const config = {
  matcher: [
    "/((?!api|_next/static|_next/image|favicon.ico|icon.svg|logo.svg|icon|apple-icon|sitemap.xml|robots.txt|.*\\.svg$).*)",
  ],
};
