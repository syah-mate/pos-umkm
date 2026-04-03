import { NextRequest, NextResponse } from 'next/server';
import jwt from 'jsonwebtoken';

export async function GET(request: NextRequest) {
  try {
    const authHeader = request.headers.get('authorization');

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return NextResponse.json(
        { error: 'No token provided' },
        { status: 401 }
      );
    }

    const token = authHeader.substring(7);

    try {
      const decoded = jwt.verify(token, process.env.JWT_SECRET!) as any;

      return NextResponse.json(
        { 
          valid: true,
          user: {
            id: decoded.userId,
            email: decoded.email,
            role: decoded.role,
            name: decoded.name,
          }
        },
        { status: 200 }
      );
    } catch (error) {
      return NextResponse.json(
        { error: 'Invalid or expired token', valid: false },
        { status: 401 }
      );
    }
  } catch (error: any) {
    console.error('Verify error:', error);
    return NextResponse.json(
      { error: 'An error occurred during verification' },
      { status: 500 }
    );
  }
}
