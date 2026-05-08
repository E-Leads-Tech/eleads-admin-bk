import "./config/env";

import express from "express";
import cors from "cors";
import helmet from "helmet";
import routes from "./routes";

export const app = express();

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
