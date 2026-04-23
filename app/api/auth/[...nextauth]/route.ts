/**
 * @module app/api/auth/[...nextauth]/route
 * NextAuth v4 catch-all route handler.
 * All configuration lives in lib/auth/options.ts — this file contains no logic.
 */

import NextAuth from "next-auth";
import { authOptions } from "@/lib/auth/options";

const handler = NextAuth(authOptions);

export { handler as GET, handler as POST };
