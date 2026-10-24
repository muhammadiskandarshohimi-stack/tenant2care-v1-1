
import { createServerClient } from '@supabase/ssr';
import type { CookieOptions } from '@supabase/ssr';
import { NextRequest, NextResponse } from 'next/server';

export async function middleware(request: NextRequest) {
  let response = NextResponse.next({ request });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(
          items: {
            name: string;
            value: string;
            options?: CookieOptions;
          }[]
        ) {
          items.forEach(({ name, value }) =>
            request.cookies.set(name, value)
          );

          response = NextResponse.next({ request });

          items.forEach(({ name, value, options }) =>
            response.cookies.set(name, value, options)
          );
        },
      },
    }
  );

  const {
    data: { user },
  } = await supabase.auth.getUser();

  const path = request.nextUrl.pathname;

  const landlordRoutes = [
    '/dashboard',
    '/properties',
    '/rooms',
    '/tenants',
    '/tenancies',
    '/payments',
    '/landlord',
  ];

  const tenantRoutes = ['/tenant/apply'];

  const matches = (prefix: string) =>
    path === prefix || path.startsWith(prefix + '/');

  const isLandlordRoute = landlordRoutes.some(matches);
  const isTenantRoute = tenantRoutes.some(matches);

  if ((isLandlordRoute || isTenantRoute) && !user) {
    const url = request.nextUrl.clone();
    url.pathname = isTenantRoute ? '/tenant/login' : '/login';
    url.search = '';
    return NextResponse.redirect(url);
  }

  if (user && (isLandlordRoute || isTenantRoute)) {
    const { data: profile, error } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .single();

    if (error || !profile) {
      const url = request.nextUrl.clone();
      url.pathname = '/unauthorized';
      return NextResponse.redirect(url);
    }

    if (isLandlordRoute && profile.role !== 'landlord') {
      const url = request.nextUrl.clone();
      url.pathname = '/unauthorized';
      return NextResponse.redirect(url);
    }

    if (
      isTenantRoute &&
      !['tenant', 'landlord'].includes(profile.role)
    ) {
      const url = request.nextUrl.clone();
      url.pathname = '/unauthorized';
      return NextResponse.redirect(url);
    }
  }

  return response;
}

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
};
