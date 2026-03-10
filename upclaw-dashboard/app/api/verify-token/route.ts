import { NextRequest, NextResponse } from 'next/server';
import jwt from 'jsonwebtoken';

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const token = searchParams.get('token');

  if (!token) {
    return NextResponse.json({ error: 'Token is required' }, { status: 400 });
  }

  try {
    const secret = process.env.JWT_SECRET || 'default-secret';
    const decoded = jwt.verify(token, secret);
    
    return NextResponse.json({
      success: true,
      decoded
    });
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : 'Invalid token';
    return NextResponse.json({
      success: false,
      error: errorMessage
    }, { status: 401 });
  }
}
