import { prisma } from "../config/db.js";
import { logger } from "../config/logger.js";
import fs from "fs/promises";
import axios from "axios";
import { processCSV } from "./csvService.js";
import { StorageManager } from "../utils/storageManager.js";
import { S3StorageManager } from "../utils/s3StorageManager.js";

function notifyClients(eventType: string) {
  if (sseBroadcast) {
    sseBroadcast(eventType, { message: "New train data available" });
  }
}

type PipelineStatus =
  | "idle"
  | "simulation_running"
  | "moo_running"
  | "rl_running"
  | "completed"
  | "failed";

interface PipelineRun {
  runId: string;
  startedAt: Date;
  status: PipelineStatus;
  details?: Record<string, unknown>;
}

const runs: Record<string, PipelineRun> = {};
let sseBroadcast: ((event: string, data: any) => void) | null = null;

export const setSseBroadcaster = (fn: (event: string, data: any) => void) => {
  sseBroadcast = fn;
};

const announce = (event: string, data: any) => {
  if (sseBroadcast) sseBroadcast(event, data);
};

export const startSimulationRunWithFile = async (runId: string, filePath: string): Promise<string> => {
  runs[runId] = {
    runId,
    startedAt: new Date(),
    status: "simulation_running",
  };
  logger.info("Pipeline run started with file", { runId, filePath });
  announce("pipeline", { runId, status: "simulation_running" });
  
  // Initialize storage
  await StorageManager.initializeStorage();
  
  // Trigger simulation with the provided file path
  try {
    await triggerSimulationWithFile(runId, filePath);
  } catch (error) {
    runs[runId].status = "failed";
    logger.error("Failed to trigger simulation with file", { runId, filePath, error: (error as Error).message });
    announce("pipeline", { runId, status: "failed", error: (error as Error).message });
  }
  
  return runId;
};

export const startSimulationRun = async (): Promise<string> => {
  const runId = `run_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
  runs[runId] = {
    runId,
    startedAt: new Date(),
    status: "simulation_running",
  };
  logger.info("Pipeline run started", { runId });
  announce("pipeline", { runId, status: "simulation_running" });
  
  // Initialize storage
  await StorageManager.initializeStorage();
  
  // Trigger simulation immediately
  try {
    await triggerSimulation(runId);
  } catch (error) {
    runs[runId].status = "failed";
    logger.error("Failed to trigger simulation", { runId, error: (error as Error).message });
    announce("pipeline", { runId, status: "failed", error: (error as Error).message });
  }
  
  return runId;
};

const triggerSimulationWithFile = async (runId: string, filePath: string) => {
  // Call simulation API with the provided file path
  const simulationUrl = `${process.env.FAST_API_BASE_URI}/simulation/start-from-file`;
  
  try {
    logger.info("Triggering simulation with file path", { runId, filePath });
    
    const response = await axios.post(simulationUrl, {
      file_path: filePath,
      runId: runId,
      days_to_simulate: 1
    }, {
      headers: {
        'Content-Type': 'application/json'
      },
      timeout: 300000, // 5 minutes timeout for simulation
    });
    
    logger.info("Simulation triggered successfully with file path", { 
      runId, 
      filePath, 
      status: response.status,
      responseData: response.data 
    });
  } catch (error) {
    logger.error("Failed to trigger simulation with file", { 
      runId, 
      filePath, 
      error: (error as Error).message,
      stack: (error as Error).stack
    });
    throw error;
  }
};

const triggerSimulation = async (runId: string) => {
  // 1. Get the latest simulation output file from S3
  const latestFileKey = await S3StorageManager.getLatestFile(
    "output/simulation/"
  );

  if (!latestFileKey) {
    throw new Error("No previous simulation output file found in S3");
  }

  console.log("[Simulation] Using latest simulation file:", latestFileKey);

  // 2. Optionally download the file if you need local processing
  // const fileBuffer = await S3StorageManager.downloadFile(latestFileKey);
  // console.log("Downloaded file size:", fileBuffer.length);

  // 3. Call simulation API with the S3 path
  const simulationUrl = `${process.env.FAST_API_BASE_URI}/simulation/start-from-file`;
  console.log("simulationUrl", simulationUrl);

  try {
    const response = await axios.post(
      simulationUrl,
      {
        file_path: latestFileKey, // pass the S3 key
        runId: runId,
        days_to_simulate: 1,
      },
      {
        headers: { "Content-Type": "application/json" },
        timeout: 120000, // 2 minutes
      }
    );

    console.log("response", response.data);
    logger.info("Simulation triggered successfully with last simulation file", {
      runId,
      filePath: latestFileKey,
      status: response.status,
    });
  } catch (error) {
    logger.error("Failed to trigger simulation", {
      runId,
      filePath: latestFileKey,
      error: (error as Error).message,
    });
    throw error;
  }
};


const convertTrainsToCSV = (trains: any[]): string => {
  if (trains.length === 0) return '';
  
  // Get all unique keys from train objects
  const headers = Object.keys(trains[0]);
  
  // Create CSV header row
  const csvRows = [headers.join(',')];
  
  // Add data rows
  trains.forEach(train => {
    const row = headers.map(header => {
      const value = train[header];
      // Handle null/undefined values
      if (value === null || value === undefined) {
        return 'NULL';
      }
      // Handle boolean values
      if (typeof value === 'boolean') {
        return value ? 'TRUE' : 'FALSE';
      }
      // Handle dates
      if (value instanceof Date) {
        return value.toLocaleDateString('en-GB'); // DD/MM/YYYY format
      }
      // Handle strings with commas (escape them)
      if (typeof value === 'string' && value.includes(',')) {
        return `"${value}"`;
      }
      return String(value);
    });
    csvRows.push(row.join(','));
  });
  
  return csvRows.join('\n');
};

export const handleSimulationFinished = async (runId: string, filePath?: string) => {
  const run = runs[runId];
  if (!run) {
    logger.warn(`handleSimulationFinished called with invalid runId: ${runId}`);
    return;
  }

  logger.info("Simulation finished webhook received", { runId, filePath });

  run.status = "moo_running";
  run.details = {
    ...run.details,
    simulation: { 
      receivedAt: new Date().toISOString(), 
      filePath,
      stage: "completed"
    },
  };
  announce("pipeline", { runId, status: "moo_running", stage: "simulation_complete" });

  // Fire-and-forget approach for faster pipeline
  setImmediate(async () => {
    try {
      // Call MOO service with simulation results
      const mooUrl = `${process.env.FAST_API_BASE_URI}/moo/start-from-file`;
      
      logger.info("Triggering MOO with simulation results", { runId, filePath });
      
      const response = await axios.post(mooUrl, {
        file_path: filePath,
        runId: runId
      }, {
        headers: {
          'Content-Type': 'application/json'
        },
        timeout: 30000
      });
      
      logger.info("MOO service started successfully with file path", { 
        runId, 
        filePath,
        status: response.status,
        responseData: response.data
      });
    } catch (error) {
      run.status = "failed";
      run.details = {
        ...run.details,
        error: {
          stage: "moo_trigger",
          message: (error as Error).message,
          timestamp: new Date().toISOString()
        }
      };
      logger.error("Failed to trigger MOO service", { 
        runId, 
        error: (error as Error).message,
        stack: (error as Error).stack
      });
      announce("pipeline", { runId, status: "failed", error: (error as Error).message });
    }
  });
};

export const handleMooFinished = async (runId: string, filePath?: string) => {
  const run = runs[runId];
  if (!run) {
    logger.warn(`handleMooFinished called with invalid runId: ${runId}`);
    return;
  }

  logger.info("MOO finished webhook received", { runId, filePath });

  run.status = "rl_running";
  run.details = {
    ...run.details,
    moo: { 
      receivedAt: new Date().toISOString(), 
      filePath,
      stage: "completed"
    },
  };
  announce("pipeline", { runId, status: "rl_running", stage: "moo_complete" });

  // Fire-and-forget approach for faster pipeline
  setImmediate(async () => {
    try {
      // Call RL service with MOO results
      const rlUrl = `${process.env.FAST_API_BASE_URI}/rl/start-from-file`;
      
      logger.info("Triggering RL with MOO results", { runId, filePath });
      
      const response = await axios.post(rlUrl, {
        file_path: filePath,
        runId: runId
      }, {
        headers: {
          'Content-Type': 'application/json'
        },
        timeout: 30000
      });
      
      logger.info("RL service started successfully with file path", { 
        runId, 
        filePath,
        status: response.status,
        responseData: response.data
      });
    } catch (error) {
      run.status = "failed";
      run.details = {
        ...run.details,
        error: {
          stage: "rl_trigger",
          message: (error as Error).message,
          timestamp: new Date().toISOString()
        }
      };
      logger.error("Failed to trigger RL service", { 
        runId, 
        error: (error as Error).message,
        stack: (error as Error).stack
      });
      announce("pipeline", { runId, status: "failed", error: (error as Error).message });
    }
  });
};

export const handleRlFinished = async (runId: string, filePath?: string) => {
  const run = runs[runId];
  if (!run) {
    logger.warn(`handleRlFinished called with invalid runId: ${runId}`);
    return;
  }

  logger.info("RL finished webhook received", { runId, filePath });

  run.status = "completed";
  run.details = {
    ...run.details,
    rl: { 
      receivedAt: new Date().toISOString(), 
      filePath,
      stage: "completed"
    },
    completedAt: new Date().toISOString()
  };
  announce("pipeline", { runId, status: "completed", stage: "rl_complete" });

  try {
    if (!filePath) throw new Error("filePath is undefined");

    // Check if final RL result file exists
    const fileExists = await StorageManager.fileExists(filePath);
    if (!fileExists) {
      throw new Error(`Final RL result file not found: ${filePath}`);
    }

    logger.info("Pipeline completed successfully", { 
      runId, 
      finalResultPath: filePath,
      duration: new Date().getTime() - run.startedAt.getTime()
    });

    // Enable database updates - you can control this via environment variable
    const shouldUpdateDatabase = process.env.UPDATE_DATABASE_ON_COMPLETION === 'true' || true; // Default to true for now
    
    if (shouldUpdateDatabase) {
      logger.info("Starting database update with RL results", { runId, filePath });
      
      // Read the final RL result file
      const buffer = await StorageManager.readFileBuffer(filePath);

      type UploadStatus = Record<string, { status: "completed" | "failed" | "processing"; progress?: number; message?: string; results?: any }>;
      const tempJobId = `rl_job_${Date.now()}`;
      const uploadStatusMap: UploadStatus = {
        [tempJobId]: { status: "processing", progress: 0 },
      };

      // Log the buffer size to ensure file is read correctly
      logger.info("File buffer read successfully", { 
        runId, 
        filePath, 
        bufferSize: buffer.length,
        tempJobId 
      });

      await processCSV(buffer, tempJobId, uploadStatusMap);

      // Check the upload status
      const uploadResult = uploadStatusMap[tempJobId];
      logger.info("CSV processing completed", { 
        runId, 
        tempJobId, 
        uploadStatus: uploadResult?.status,
        uploadMessage: uploadResult?.message,
        results: uploadResult?.results 
      });

      if (!uploadResult || uploadResult.status !== "completed") {
        throw new Error(uploadResult?.message || "CSV processing failed without message");
      }

      await prisma.train.updateMany({ data: { updatedAt: new Date() } });
      notifyClients("new_data_ready");
      logger.info("Train data successfully updated in DB from RL result file", { 
        runId, 
        filePath,
        recordsProcessed: uploadResult.results 
      });
    } else {
      logger.info("Database update skipped (UPDATE_DATABASE_ON_COMPLETION is not set to 'true')", { runId });
    }

  } catch (error) {
    run.status = "failed";
    run.details = {
      ...run.details,
      error: {
        stage: "rl_completion",
        message: (error as Error).message,
        timestamp: new Date().toISOString()
      }
    };
    logger.error("Pipeline failed during RL data processing", { 
      runId, 
      filePath, 
      error: (error as Error).message,
      stack: (error as Error).stack
    });
    announce("pipeline", { runId, status: "failed", error: (error as Error).message });
  }
};

export const getRun = (runId: string) => runs[runId];

export const listRuns = () => Object.values(runs).sort((a, b) => b.startedAt.getTime() - a.startedAt.getTime());
