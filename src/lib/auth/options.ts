import NextAuth from 'next-auth';
import Credentials from 'next-auth/providers/credentials';
import { compare } from 'bcryptjs';

export const { handlers, auth, signIn, signOut } = NextAuth({
  providers: [
    Credentials({
      credentials: { email: {}, password: {} },
      async authorize(credentials) {
        if (!credentials?.email || !credentials?.password) return null;
        // TODO: Später mit Drizzle aus DB lesen
        // Für jetzt: dummy auth für dev
        return { id: 'dev-user', email: credentials.email as string, name: 'Dev User' };
      }
    })
  ],
  session: { strategy: 'jwt' },
  pages: { signIn: '/login' }
});