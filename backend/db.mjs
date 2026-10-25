import mongoose from "mongoose";

let connectionPromise;
let listenersRegistered = false;

function databaseName() {
  return process.env.DB_NAME?.trim() || "solarious";
}

function validateDatabaseUri(uri) {
  let parsed;
  try {
    parsed = new URL(uri);
  } catch {
    throw new Error("MONGODB_URI must be a valid MongoDB connection string. URL-encode special characters in the database password.");
  }

  if (!['mongodb:', 'mongodb+srv:'].includes(parsed.protocol)) {
    throw new Error("MONGODB_URI must start with mongodb:// or mongodb+srv://");
  }

  if (process.env.NODE_ENV === 'production') {
    if (parsed.protocol !== 'mongodb+srv:' || !parsed.hostname.endsWith('.mongodb.net')) {
      throw new Error("Production MONGODB_URI must be a MongoDB Atlas mongodb+srv:// URI.");
    }
  }
}

function registerConnectionListeners() {
  if (listenersRegistered) return;
  listenersRegistered = true;
  mongoose.connection.on("connected", () => {
    console.log("MongoDB connected", { database: databaseName() });
  });
  mongoose.connection.on("disconnected", () => {
    console.warn("MongoDB disconnected", { database: databaseName() });
  });
  mongoose.connection.on("error", (error) => {
    console.error("MongoDB connection error", {
      database: databaseName(),
      name: error?.name || "Error",
      message: error?.message || "Unknown database error",
    });
  });
}

export function connectDatabase() {
  if (mongoose.connection.readyState === 1) {
    return Promise.resolve(mongoose.connection);
  }
  if (connectionPromise) return connectionPromise;

  const uri = process.env.MONGODB_URI?.trim();
  if (!uri) throw new Error("MONGODB_URI is required");
  validateDatabaseUri(uri);

  registerConnectionListeners();
  mongoose.set("strictQuery", true);
  connectionPromise = mongoose
    .connect(uri, {
      appName: "solarious-api",
      dbName: databaseName(),
      serverSelectionTimeoutMS: 15_000,
      connectTimeoutMS: 15_000,
      socketTimeoutMS: 45_000,
      maxIdleTimeMS: 60_000,
      maxPoolSize: 10,
      minPoolSize: 0,
      retryWrites: true,
    })
    .then(() => mongoose.connection)
    .catch((error) => {
      connectionPromise = undefined;
      throw error;
    });
  return connectionPromise;
}

export function databaseStatus() {
  return {
    connected: mongoose.connection.readyState === 1,
    state:
      ["disconnected", "connected", "connecting", "disconnecting"][
        mongoose.connection.readyState
      ] || "unknown",
    name: mongoose.connection.name || databaseName(),
  };
}

export async function disconnectDatabase() {
  connectionPromise = undefined;
  if (mongoose.connection.readyState !== 0) await mongoose.disconnect();
}

export { mongoose };
