import NextAuth from "next-auth";
import Google from "next-auth/providers/google";
import { MongoDBAdapter } from "@auth/mongodb-adapter";
import clientPromise from "@/lib/mongodb";

export const { handlers, signIn, signOut, auth } = NextAuth({
  adapter: MongoDBAdapter(clientPromise, {
    databaseName: "4th-and-long",
  }),
  // Keep JWT so sessions don't require a DB round-trip on every request.
  // The adapter still persists users + accounts on first sign-in.
  session: { strategy: "jwt" },
  providers: [
    Google({
      clientId: process.env.GOOGLE_CLIENT_ID!,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
    }),
  ],
  callbacks: {
    async session({ session, token }) {
      if (session.user && token) {
        // token.sub is the MongoDB _id string when using an adapter + JWT
        session.user.id = token.sub!;
        (session.user as typeof session.user & { provider?: string }).provider =
          token.provider as string;
      }
      return session;
    },
    async jwt({ token, account }) {
      if (account) {
        token.provider = account.provider;
      }
      return token;
    },
  },
  pages: {
    signIn: "/login",
  },
});
