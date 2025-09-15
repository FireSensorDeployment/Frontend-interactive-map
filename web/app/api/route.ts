import { randomPoint, area, bbox } from "@turf/turf";
import { NextResponse } from "next/server"; 
export async function POST(req: Request) {
    const body = await req.json();
    /* 
    # 暂时Comment直到后期串联起来
    const base = process.env.PY_BACKEND_URL!;
    const r = await fetch(`${base}/api/sensors/plan`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });
    const text = await r.text();
    const ct = r.headers.get('content-type') ?? 'application/json';
    return new Response(text, { status: r.status, headers: { 'content-type': ct } });
    */

    // Mocking backend response
    if (!body || !body.geometry || area(body) < 10000 ) {
      return new Response(
        JSON.stringify({ message: "Area of interest is too small or invalid."}), { status: 400, headers: {'Content-Type' : 'application/json'}}
      );
    }

    const numberOfPoints = 5;
    // 这里有建议用mask, 但是目前版本没有这个功能, 是否要升级?
    const points = randomPoint(numberOfPoints, { bbox : bbox(body) }); 

    return NextResponse.json(points)

  }
  