import { PrismaAdapter } from "@auth/prisma-adapter";
import bcrypt from "bcryptjs";
import NextAuth, { CredentialsSignin } from "next-auth";
import Credentials from "next-auth/providers/credentials";
import type { Provider } from "next-auth/providers";

import authConfig from "@/auth.config";
import { isEmailVerificationEnabled } from "@/lib/auth/email-verification";
import { prisma } from "@/lib/prisma";
import { checkRateLimit, getClientIp, resetRateLimit } from "@/lib/rate-limit";

function getProviderId(provider: Provider): string | undefined {
  if (typeof provider === "function") {
    return provider().id;
  }

  return provider.id;
}

const providersWithoutCredentials = authConfig.providers.filter(
  (provider) => getProviderId(provider) !== "credentials"
);

class EmailUnverifiedError extends CredentialsSignin {
  code = "email_unverified";
}

class RateLimitedError extends CredentialsSignin {
  code = "rate_limited";
}

export const { auth, handlers, signIn, signOut } = NextAuth({
  ...authConfig,
  adapter: PrismaAdapter(prisma as unknown as Parameters<typeof PrismaAdapter>[0]),
  session: { strategy: "jwt" },
  providers: [
    ...providersWithoutCredentials,
    Credentials({
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" },
      },
      async authorize(credentials, request) {
        const email =
          typeof credentials.email === "string"
            ? credentials.email.trim().toLowerCase()
            : "";
        const password =
          typeof credentials.password === "string" ? credentials.password : "";

        if (!email || !password) {
          return null;
        }

        const loginKey = `${getClientIp(request)}:${email}`;
        const rateLimit = await checkRateLimit("login", loginKey);

        if (!rateLimit.success) {
          throw new RateLimitedError();
        }

        const user = await prisma.user.findUnique({
          where: { email },
          select: {
            id: true,
            name: true,
            email: true,
            emailVerified: true,
            image: true,
            passwordHash: true,
          },
        });

        if (!user?.passwordHash) {
          return null;
        }

        const passwordMatches = await bcrypt.compare(password, user.passwordHash);

        if (!passwordMatches) {
          return null;
        }

        if (isEmailVerificationEnabled() && !user.emailVerified) {
          throw new EmailUnverifiedError();
        }

        await resetRateLimit("login", loginKey);

        return {
          id: user.id,
          name: user.name,
          email: user.email,
          image: user.image,
        };
      },
    }),
  ],
  callbacks: {
    jwt({ token, user }) {
      if (user) {
        token.id = user.id;
      }

      return token;
    },
    session({ session, token }) {
      if (session.user && typeof token.id === "string") {
        session.user.id = token.id;
      }

      return session;
    },
  },
});
