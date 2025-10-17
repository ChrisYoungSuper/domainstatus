import { NextResponse } from 'next/server';

export async function POST(request) {
  try {
    const { domain } = await request.json();
    
    if (!domain) {
      return NextResponse.json({ error: 'Domain is required' }, { status: 400 });
    }

    const results = {
      domain,
      https: null,
      http: null,
      bestProtocol: null,
      status: 'unreachable'
    };

    // 检测 HTTPS
    try {
      const httpsStart = Date.now();
      const httpsResponse = await fetch(`https://${domain}`, {
        method: 'HEAD',
        redirect: 'follow',
        signal: AbortSignal.timeout(10000) // 10秒超时
      });
      
      results.https = {
        statusCode: httpsResponse.status,
        statusText: httpsResponse.statusText,
        responseTime: Date.now() - httpsStart,
        reachable: httpsResponse.ok,
        redirected: httpsResponse.redirected,
        finalUrl: httpsResponse.url
      };
      
      if (httpsResponse.ok) {
        results.bestProtocol = 'https';
        results.status = 'reachable';
      }
    } catch (error) {
      results.https = {
        error: error.message,
        reachable: false
      };
    }

    // 检测 HTTP
    try {
      const httpStart = Date.now();
      const httpResponse = await fetch(`http://${domain}`, {
        method: 'HEAD',
        redirect: 'follow',
        signal: AbortSignal.timeout(10000)
      });
      
      results.http = {
        statusCode: httpResponse.status,
        statusText: httpResponse.statusText,
        responseTime: Date.now() - httpStart,
        reachable: httpResponse.ok,
        redirected: httpResponse.redirected,
        finalUrl: httpResponse.url
      };
      
      if (httpResponse.ok && !results.bestProtocol) {
        results.bestProtocol = 'http';
        results.status = 'reachable';
      }
    } catch (error) {
      results.http = {
        error: error.message,
        reachable: false
      };
    }

    return NextResponse.json(results);
    
  } catch (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
