
import mongoose from "mongoose";

let cached = globalThis.mongooseConnection;

if (!cached) {
  cached = globalThis.mongooseConnection = {
    conn: null,
    promise: null,
  };
}

const connectDb = async () => {
  if (cached.conn && mongoose.connection.readyState === 1) {
    return cached.conn;
  }

  if (!process.env.MONGODB_URI) {
    throw new Error("MONGODB_URI is not configured");
  }

  if (!cached.promise) {
    cached.promise = mongoose
      .connect(process.env.MONGODB_URI)
      .then((connection) => connection)
      .catch((error) => {
        cached.promise = null;
        throw error;
      });
  }

  cached.conn = await cached.promise;

  console.log("MongoDB connected:", cached.conn.connection.host);

  return cached.conn;
};

export default connectDb;
