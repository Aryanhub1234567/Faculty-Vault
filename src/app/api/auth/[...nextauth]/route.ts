import NextAuth from "next-auth";
import { authOptions } from "@/lib/auth/auth";
import { NextRequest, NextResponse } from "next/server";

const nextAuthHandler = NextAuth(authOptions);

async function safeAuthHandler(req: NextRequest, context: any) {
  try {
    return await nextAuthHandler(req, context);
  } catch (error: any) {
    console.error("[NextAuth Route Handler Uncaught Error]:", error);
    const loginUrl = new URL("/login", req.url);
    loginUrl.searchParams.set("error", "AuthenticationError");
    return NextResponse.redirect(loginUrl);
  }
}

export { safeAuthHandler as GET, safeAuthHandler as POST };
