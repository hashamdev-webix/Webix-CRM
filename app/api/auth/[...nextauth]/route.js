import NextAuth from 'next-auth';
import CredentialsProvider from 'next-auth/providers/credentials';
import connectDB from '@/lib/mongodb';
import User from '@/models/User';
import '@/models/Role';

export const authOptions = {
  providers: [
    CredentialsProvider({
      name: 'credentials',
      credentials: {
        email: { label: 'Email', type: 'email' },
        password: { label: 'Password', type: 'password' },
      },
      async authorize(credentials) {
        if (!credentials?.email || !credentials?.password) return null;

        await connectDB();

        // Populate roles so we can flatten permissionKeys
        const user = await User.findOne({ email: credentials.email, isActive: true })
          .select('+password')
          .populate('roles');

        if (!user) return null;

        const isValid = await user.comparePassword(credentials.password);
        if (!isValid) return null;

        const permissions = user.resolvePermissions();

        return {
          id: user._id.toString(),
          name: user.name,
          email: user.email,
          role: user.role,
          permissions,
          company_id: user.company_id?.toString() || null,
        };
      },
    }),
  ],
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        token.id = user.id;
        token.role = user.role;
        token.permissions = user.permissions;
        token.company_id = user.company_id || null;
      } else if (token.id && !token.role) {
        // Stale token — re-hydrate from DB
        await connectDB();
        const dbUser = await User.findById(token.id).populate('roles');
        if (dbUser) {
          token.role = dbUser.role;
          token.permissions = dbUser.resolvePermissions();
          token.company_id = dbUser.company_id?.toString() || null;
        }
      }
      return token;
    },
    async session({ session, token }) {
      if (token) {
        session.user.id = token.id;
        session.user.role = token.role;
        session.user.permissions = token.permissions;
        session.user.company_id = token.company_id || null;
      }
      return session;
    },
  },
  pages: {
    signIn: '/login',
    error: '/login',
  },
  session: {
    strategy: 'jwt',
    maxAge: 24 * 60 * 60, // 24 hours
  },
  secret: process.env.NEXTAUTH_SECRET,
};

const handler = NextAuth(authOptions);
export { handler as GET, handler as POST };
