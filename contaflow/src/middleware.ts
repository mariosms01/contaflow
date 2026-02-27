import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

export function middleware(request: NextRequest) {
    const authToken = request.cookies.get('contaflow_auth')?.value;
    const isLoginPage = request.nextUrl.pathname.startsWith('/login');
    const validToken = process.env.AUTH_SECRET;

    if (isLoginPage) {
        if (authToken === validToken && validToken !== undefined) {
            return NextResponse.redirect(new URL('/', request.url));
        }
        return NextResponse.next();
    }

    if (authToken !== validToken || validToken === undefined) {
        return NextResponse.redirect(new URL('/login', request.url));
    }

    return NextResponse.next();
}

export const config = {
    matcher: ['/((?!api|_next/static|_next/image|favicon.ico).*)'],
};
