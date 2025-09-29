import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import authRoutes from "./routes/authRoutes.js";
import trainRoutes from "./routes/trainRoutes.js";
import uploadRoutes from "./routes/uploadroutes.js";
import pipelineRoutes from "./routes/pipelineRoutes.js";
import webhookRoutes from "./routes/webhookRoutes.js"; // Enable pipeline webhooks
import { setSseBroadcaster, startSimulationRun } from "./services/pipelineService.js";
import { StorageManager } from "./utils/storageManager.js";
import cron from "node-cron";

dotenv.config({ debug: false });

// Initialize storage on startup
StorageManager.initializeStorage().catch(console.error);

const app = express();
const port = process.env.PORT || 8000;

const corsOptions = {
    origin: "*",
    methods: "POST,GET,PUT,DELETE,PATCH,HEAD",
    credentials: true,
};

app.use(cors(corsOptions));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

app.use("/api/upload", uploadRoutes);
app.use("/api/pipeline", pipelineRoutes);
app.use("/api/auth", authRoutes);
app.use("/api/train", trainRoutes);
app.use("/api/webhook", webhookRoutes); 

app.get("/api/events", (req, res) => {
    res.setHeader("Content-Type", "text/event-stream");
    res.setHeader("Cache-Control", "no-cache");
    res.setHeader("Connection", "keep-alive");
    res.flushHeaders?.();

    const write = (event: string, data: any) => {
        res.write(`event: ${event}\n`);
        res.write(`data: ${JSON.stringify(data)}\n\n`);
    };

    setSseBroadcaster(write);

    req.on("close", () => {
        console.log("Client disconnected from SSE stream");
    });
});

cron.schedule("0 21 */2 * *", async () => {
    console.log("[Cron] Triggering simulation run (every 5 minutes)");
    try {
        await startSimulationRun();
    } catch (e) {
        console.error("[Cron] startSimulationRun failed:", (e as Error).message);
    }
});

app.get("/", (req, res) => {
    res.send("🚀 Server is up and running");
});

app.use((err: any, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
    console.error("[Global Error Handler] Unhandled error:", err);
    const status = err?.status || 500;
    res.status(status).json({ message: err?.message || "Internal Server Error" });
});

app.listen(port, async () => {
    console.log(`🌐 Server running at http://localhost:${port}`);
    console.log(`📁 Shared storage path: ${process.env.SHARED_STORAGE_PATH || '/shared/storage'}`);
});
