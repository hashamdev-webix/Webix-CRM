export { default } from 'next-auth/middleware';

export const config = {
  matcher: [
    '/dashboard/:path*',
    '/leads/:path*',
    '/ad-performance/:path*',
    '/team/:path*',
    '/settings/:path*',
  ],
};
