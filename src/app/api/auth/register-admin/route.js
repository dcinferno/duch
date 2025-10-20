import { connectToDB } from "../../../../lib/mongodb";
import User from "../../../../models/users";
import bcrypt from "bcrypt";

export async function POST(req) {
  const SERVER_SECRET_KEY = process.env.ADMIN_REGISTRATION_SECRET;

  try {
    const { username, email, password, secretKey } = await req.json();

    if (!username || !email || !password || !secretKey) {
      return new Response(JSON.stringify({ error: "Missing fields" }), {
        status: 400,
      });
    }

    if (secretKey !== SERVER_SECRET_KEY) {
      return new Response(JSON.stringify({ error: "Invalid Entry" }), {
        status: 401,
      });
    }

    await connectToDB();

    const existingUser = await User.findOne({ username });
    if (existingUser) {
      return new Response(JSON.stringify({ error: "User already exists" }), {
        status: 409,
      });
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    const newUser = new User({
      username,
      email,
      password: hashedPassword,
      isAdmin: true,
    });

    await newUser.save();

    return new Response(JSON.stringify({ message: "Admin user registered" }), {
      status: 201,
    });
  } catch (error) {
    console.error(error);
    return new Response(JSON.stringify({ error: "Internal Server Error" }), {
      status: 500,
    });
  }
}
