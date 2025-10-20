import CredentialsProvider from "next-auth/providers/credentials";
import User from "../models/users"; // your Mongoose user model
import { connectToDB } from "./mongodb"; // your Mongoose connection helper
import bcrypt from "bcrypt";

export const authOptions = {
  providers: [
    CredentialsProvider({
      name: "Credentials",
      credentials: {
        username: { label: "Username", type: "text" },
        password: { label: "Password", type: "password" },
      },
      async authorize(credentials) {
        await connectToDB();

        const user = await User.findOne({ username: credentials.username });
        if (!user) {
          return null; // user not found
        }

        const isValid = await bcrypt.compare(
          credentials.password,
          user.password
        );
        if (!isValid) {
          return null; // invalid password
        }

        // Return user object without password
        return {
          id: user._id.toString(),
          username: user.username,
          email: user.email,
          isAdmin: user.isAdmin,
        };
      },
    }),
  ],
  callbacks: {
    async session({ session, token }) {
      session.user.isAdmin = token.isAdmin;
      session.user.id = token.id;
      return session;
    },
    async jwt({ token, user }) {
      if (user) {
        token.isAdmin = user.isAdmin;
        token.id = user.id;
      }
      return token;
    },
  },
  secret: process.env.NEXTAUTH_SECRET,
};
