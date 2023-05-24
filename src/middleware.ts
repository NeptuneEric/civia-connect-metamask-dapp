import { NextResponse, NextRequest } from 'next/server';
import type { NextFetchEvent } from 'next/server';
export const runtime = 'experimental-edge';
 
export const config = {
  runtime: 'edge',
  matcher: '/api/:path*'
};

const wait = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));
 
export default async function getSessionToken(
  request: NextRequest,
  context: NextFetchEvent,
) {
    const url = new URL(request.url);
    console.log('=====');
    console.info(request.body);
    console.log(request.headers);
    
    if(url.pathname.startsWith('/api/test')){
        return new Response('Blocked for legal reasons', { status: 451 });
    } else if(url.pathname.startsWith('/api/getSessionToken')){
        const res = await fetch('http://101.132.135.175:5000/getSessionToken', {
            method: 'POST',
            headers: {
                "Content-Type": "application/json",
                ...request.headers
            },
            body: request.body || "{}"
        });
        return res;
    } else if(url.pathname.startsWith('/api/app/')){
        const res = await fetch(`http://101.132.135.175:5000/${url.pathname.slice(5)}`, {
            method: 'POST',
            headers: {
                "Content-Type": "application/json",
                ...request.headers
            },
            body: request.body || "{}"
        });
        return res;
    }
}