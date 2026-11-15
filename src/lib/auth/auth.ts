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
    ...(process.env.AUTH_GOOGLE_ID && process.env.AUTH_GOOGLE_SECRET && process.env.AUTH_GOOGLE_ID !== "mock-google-client-id"
      ? [
          GoogleProvider({
            clientId: process.env.AUTH_GOOGLE_ID,
            clientSecret: process.env.AUTH_GOOGLE_SECRET,
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
      },
    }),
  ],
  callbacks: {
    async signIn({ user, account }) {
      if (account?.provider === "google" && user.email) {
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
      }

      return token;
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
