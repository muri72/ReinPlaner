import NextAuth from 'next-auth';
import Credentials from 'next-auth/providers/credentials';
import { compare } from 'bcryptjs';
import { db } from '@/lib/db';
import { profiles } from '@/lib/db/schema';

export const { handlers, auth, signIn, signOut } = NextAuth({
  providers: [
    Credentials({
      credentials: { email: {}, password: {} },
      async authorize(credentials) {
        if (!credentials?.email || !credentials?.password) return null;

        const email = credentials.email as string;
        const password = credentials.password as string;

        // DB-Abfrage nach Profil mit Passwort-Hash
        const profile = await db.query.profiles.findFirst({
          where: (profiles, { eq }) => eq(profiles.email, email),
        });

        if (!profile || !profile.passwordHash) return null;

        const valid = await compare(password, profile.passwordHash);
        if (!valid) return null;

        return {
          id: profile.id,
          email: profile.email,
          name: profile.fullName ?? profile.email,
          role: profile.role,
          tenantId: profile.tenantId,
        };
      }
    })
  ],
  session: { strategy: 'jwt' },
  pages: { signIn: '/login' },
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        token.id = user.id;
        token.role = (user as any).role;
        token.tenantId = (user as any).tenantId;
      }
      return token;
    },
    async session({ session, token }) {
      if (token && session.user) {
        session.user.id = token.id as string;
        (session.user as any).role = token.role;
        (session.user as any).tenantId = token.tenantId;
      }
      return session;
    }
  }
});