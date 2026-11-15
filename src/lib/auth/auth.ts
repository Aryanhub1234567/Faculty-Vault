import { NextAuthOptions } from "next-auth";
import GoogleProvider from "next-auth/providers/google";
import CredentialsProvider from "next-auth/providers/credentials";
import { prisma } from "@/lib/db/prisma";

export const authOptions: NextAuthOptions = {
  session: {
    strategy: "jwt",
  },
  pages: {
    signIn: "/login",
    newUser: "/onboarding",
    error: "/login",
  },
  providers: [
    // 1. Google OAuth Provider for Production
    ...(process.env.AUTH_GOOGLE_ID || process.env.GOOGLE_CLIENT_ID
      ? [
          GoogleProvider({
            clientId: (process.env.AUTH_GOOGLE_ID || process.env.GOOGLE_CLIENT_ID)!,
            clientSecret: (process.env.AUTH_GOOGLE_SECRET || process.env.GOOGLE_CLIENT_SECRET)!,
          }),
        ]
      : []),

    // 2. Seamless Local Development / Reviewer Provider
    CredentialsProvider({
      id: "credentials",
      name: "Faculty Vault Account",
      credentials: {
        email: { label: "Email", type: "email" },
        role: { label: "Role", type: "text" },
      },
      async authorize(credentials) {
        if (!credentials?.email) {
          return null;
        }

        const email = credentials.email.trim().toLowerCase();

        try {
          // Check if user already exists
          let user = await prisma.user.findUnique({
            where: { email },
            include: { facultyProfile: true },
          });

          // Determine admin status
          const adminEmails = (process.env.ADMIN_EMAILS || "")
            .split(",")
            .map((e) => e.trim().toLowerCase())
            .filter(Boolean);
          const isAdmin = adminEmails.includes(email) || credentials.role === "ADMIN";

          if (!user) {
            user = await prisma.user.create({
              data: {
                email,
                name: email.split("@")[0].replace(".", " "),
                role: isAdmin ? "ADMIN" : "FACULTY",
                accountStatus: isAdmin ? "APPROVED" : "PENDING",
              },
              include: { facultyProfile: true },
            });
          }

          return {
            id: user.id,
            name: user.name,
            email: user.email,
            image: user.image,
            role: user.role,
            accountStatus: user.accountStatus,
            hasProfile: !!user.facultyProfile,
          };
        } catch (error) {
          console.error("[NextAuth] Database error in authorize:", error);
          // Return null to signal failed credentials sign-in cleanly without leaking
          // raw multiline error strings into the redirect URL which causes "Headers.set: invalid header value"
          return null;
        }
      },
    }),
  ],
  callbacks: {
    async signIn({ user, account }) {
      if (account?.provider === "google" && user.email) {
        try {
          const email = user.email.toLowerCase();
          const adminEmails = (process.env.ADMIN_EMAILS || "")
            .split(",")
            .map((e) => e.trim().toLowerCase());
          const isAdmin = adminEmails.includes(email);

          // Upsert user in database
          const dbUser = await prisma.user.upsert({
            where: { email },
            update: {
              name: user.name ?? undefined,
              image: user.image ?? undefined,
              ...(isAdmin ? { role: "ADMIN", accountStatus: "APPROVED" } : {}),
            },
            create: {
              email,
              name: user.name ?? email.split("@")[0],
              image: user.image ?? undefined,
              role: isAdmin ? "ADMIN" : "FACULTY",
              accountStatus: isAdmin ? "APPROVED" : "PENDING",
            },
          });

          user.id = dbUser.id;
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          (user as any).role = dbUser.role;
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          (user as any).accountStatus = dbUser.accountStatus;
        } catch (error) {
          console.error("[NextAuth] Database error in Google signIn callback:", error);
          // Return clean redirect to error page without embedding raw database/Prisma error text
          // to prevent "Headers.set: invalid header value" HTTP errors
          return "/login?error=DatabaseError";
        }
      }
      return true;
    },
    async jwt({ token, user, trigger, session }) {
      if (user) {
        token.id = user.id;
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        token.role = (user as any).role;
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        token.accountStatus = (user as any).accountStatus;
      }

      if (trigger === "update" && session) {
        if (session.user?.name) token.name = session.user.name;
        if (session.user?.role) token.role = session.user.role;
        if (session.user?.accountStatus) token.accountStatus = session.user.accountStatus;
      }

      // Check current user details from database on token verification
      if (token.id) {
        try {
          const dbUser = await prisma.user.findUnique({
            where: { id: token.id as string },
            include: { facultyProfile: true },
          });
          if (dbUser) {
            token.role = dbUser.role;
            token.accountStatus = dbUser.accountStatus;
            token.hasProfile = !!dbUser.facultyProfile;
            token.facultyProfileId = dbUser.facultyProfile?.id;
            token.facultyId = dbUser.facultyProfile?.facultyId;
          }
        } catch (error) {
          console.error("[NextAuth] Database error in jwt callback:", error);
        }
      }

      return token;
    },
    async redirect({ url, baseUrl }) {
      // Prevent header injection / invalid header value errors by stripping any newline or carriage return characters
      const sanitizedUrl = url.replace(/[\r\n]/g, "");
      if (sanitizedUrl.startsWith("/")) return `${baseUrl}${sanitizedUrl}`;
      try {
        if (new URL(sanitizedUrl).origin === baseUrl) return sanitizedUrl;
      } catch {
        return baseUrl;
      }
      return baseUrl;
    },
    async session({ session, token }) {
      if (session.user) {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        (session.user as any).id = token.id as string;
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        (session.user as any).role = token.role as string;
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        (session.user as any).accountStatus = token.accountStatus as string;
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        (session.user as any).hasProfile = token.hasProfile as boolean;
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        (session.user as any).facultyProfileId = token.facultyProfileId as string | undefined;
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        (session.user as any).facultyId = token.facultyId as string | undefined;
      }
      return session;
    },
  },
  secret: process.env.NEXTAUTH_SECRET || "faculty-vault-secret-key-32-chars-length-min",
};
