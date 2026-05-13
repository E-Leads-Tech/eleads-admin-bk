import "./config/env";

import express from "express";
import cors from "cors";
import helmet from "helmet";
import routes from "./routes";

export const app = express();

// Trust the first proxy (ALB) so that express-rate-limit can read the real
// client IP from the X-Forwarded-For header instead of the ALB's private IP.
app.set("trust proxy", 1);

app.use(helmet());
app.use(
  cors({
    origin: process.env.CORS_ORIGIN || "*",
    methods: ["GET", "POST", "PUT", "DELETE"],
  }),
);
app.use(express.json({ limit: "100kb" }));

app.get("/health", (_, res) => {
  res.json({ status: "Server running" });
});

app.use("/api/v1", routes);
