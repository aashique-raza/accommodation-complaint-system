import mongoose from "mongoose";

let isConnected = false;

const connectDB = async () => {
  try {
    if (!process.env.MONGODB_URI) {
      console.error("Missing environment variable: MONGODB_URI");
      process.exit(1);
    }

    if (isConnected) {
      console.log("MongoDB connection already established");
      return mongoose.connection;
    }

    mongoose.set("strictQuery", true);

    const conn = await mongoose.connect(process.env.MONGODB_URI, {
      serverSelectionTimeoutMS: 10000,
      socketTimeoutMS: 45000,
    });

    isConnected = conn.connections[0].readyState === 1;

    console.log("MongoDB connection established successfully");
    console.log(`Database host: ${conn.connection.host}`);
    console.log(`Database name: ${conn.connection.name}`);

    mongoose.connection.on("error", (error) => {
      console.error("MongoDB runtime error:", error.message);
    });

    mongoose.connection.on("disconnected", () => {
      console.warn("MongoDB disconnected");
      isConnected = false;
    });

    mongoose.connection.on("reconnected", () => {
      console.log("MongoDB reconnected successfully");
      isConnected = true;
    });

    return mongoose.connection;
  } catch (error) {
    isConnected = false;

    if (error.name === "MongooseServerSelectionError") {
      console.error(
        "MongoDB connection failed: unable to reach database server",
      );
    } else if (error.name === "MongoParseError") {
      console.error("MongoDB connection failed: invalid connection string");
    } else if (error.name === "MongoNetworkError") {
      console.error("MongoDB connection failed: network error");
    } else if (error.name === "MongoTimeoutError") {
      console.error("MongoDB connection failed: connection timed out");
    } else {
      console.error("MongoDB connection failed:", error.message);
    }

    process.exit(1);
  }
};

export const disconnectDB = async () => {
  try {
    if (!mongoose.connection.readyState) {
      console.log("MongoDB is already disconnected");
      return;
    }

    await mongoose.connection.close();
    isConnected = false;
    console.log("MongoDB connection closed gracefully");
  } catch (error) {
    console.error("Error while closing MongoDB connection:", error.message);
  }
};

export default connectDB;
