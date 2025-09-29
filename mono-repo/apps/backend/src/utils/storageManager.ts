import fs from "fs/promises";
import path from "path";
import { logger } from "../config/logger.js";
import { S3StorageManager, type S3StorageConfig } from "./s3StorageManager.js";

/**
 * Centralized storage manager for handling file-based pipeline operations
 * Now supports both local storage (legacy) and AWS Supabase Storage
 * Automatically switches based on environment configuration
 */

// Storage directory structure
export const STORAGE_PATHS = {
  ROOT: process.env.SHARED_STORAGE_PATH || "/shared/storage",
  INPUT: "input",
  OUTPUT: "output",
  TEMP: "temp"
} as const;

// File naming conventions for pipeline
export const FILE_PATTERNS = {
  USER_UPLOAD: (uploadId: string) => `user_upload_${uploadId}.csv`,
  SIMULATION_RESULT: (runId: string) => `simulation_result_${runId}.csv`,
  MOO_RESULT: (runId: string) => `moo_result_${runId}.csv`,
  RL_FINAL: (runId: string) => `rl_final_${runId}.csv`
} as const;

/**
 * Storage utility class for managing pipeline files
 */
export class StorageManager {
  private static readonly baseStoragePath = STORAGE_PATHS.ROOT;
  private static useSupabase = false;
  private static supabaseInitialized = false;

  /**
   * Initialize storage - either local directories or AWS Supabase Storage
   */
  static async initializeStorage(): Promise<void> {
    // Check if Supabase configuration is available
    const accessKeyId = process.env.AWS_ACCESS_KEY_ID;
    const secretAccessKey = process.env.AWS_SECRET_ACCESS_KEY;
    const region = process.env.AWS_REGION;
    const bucketName = process.env.AWS_BUCKET_NAME;

    if (accessKeyId && secretAccessKey && region && bucketName) {
      // Initialize Supabase Storage
      this.useSupabase = true;
      try {
        const config: S3StorageConfig = {
          accessKeyId,
          secretAccessKey,
          region,
          bucketName,
          ...(process.env.AWS_ENDPOINT && { endpoint: process.env.AWS_ENDPOINT })
        };
        
        S3StorageManager.initialize(config);
        await S3StorageManager.initializeStorage();
        this.supabaseInitialized = true;
        logger.info("Storage initialized with AWS Supabase Storage", { bucketName, region });
      } catch (error) {
        logger.error("Failed to initialize Supabase Storage, falling back to local", error);
        this.useSupabase = false;
        await this.initializeLocalStorage();
      }
    } else {
      // Fall back to local storage
      this.useSupabase = false;
      await this.initializeLocalStorage();
    }
  }

  static async getLatestFile(prefix: string): Promise<string | null> {
    const bucket = process.env.S3_BUCKET_NAME!;
    return S3StorageManager.getLatestFile(prefix);
  }

  /**
   * Initialize local storage directories (legacy/fallback)
   */
  private static async initializeLocalStorage(): Promise<void> {
    try {
      const directories = [
        this.getStoragePath("input"),
        this.getStoragePath("output"),
        this.getStoragePath("temp")
      ];

      for (const dir of directories) {
        await fs.mkdir(dir, { recursive: true });
        logger.info(`Local storage directory ensured: ${dir}`);
      }
      logger.info("Storage initialized with local file system");
    } catch (error) {
      logger.error("Failed to initialize local storage directories", error);
      throw error;
    }
  }

  /**
   * Get full path for a storage subdirectory
   */
  static getStoragePath(subPath: string): string {
    return path.join(this.baseStoragePath, subPath);
  }

  /**
   * Get full file path in a specific storage directory
   */
  static getFilePath(directory: keyof typeof STORAGE_PATHS, filename: string): string {
    const subPath = directory === "ROOT" ? "" : STORAGE_PATHS[directory];
    return path.join(this.baseStoragePath, subPath, filename);
  }

  /**
   * Save initial train data for pipeline processing
   */
  static async saveUserUpload(uploadId: string, csvData: string): Promise<string> {
    if (this.useSupabase && this.supabaseInitialized) {
      try {
        return await S3StorageManager.saveUserUpload(uploadId, csvData);
      } catch (error) {
        logger.error("Supabase upload failed, falling back to local", error);
        // Fall back to local storage
      }
    }
    
    // Local storage fallback
    const filename = FILE_PATTERNS.USER_UPLOAD(uploadId);
    const filePath = this.getFilePath("INPUT", filename);
    
    try {
      await fs.writeFile(filePath, csvData, "utf-8");
      logger.info(`User upload saved locally: ${filePath}`);
      return filePath;
    } catch (error) {
      logger.error(`Failed to save user upload: ${filePath}`, error);
      throw error;
    }
  }

  /**
   * Save simulation results
   */
  static async saveSimulationResult(runId: string, csvData: string): Promise<string> {
    if (this.useSupabase && this.supabaseInitialized) {
      try {
        return await S3StorageManager.saveSimulationResult(runId, csvData);
      } catch (error) {
        logger.error("Supabase upload failed, falling back to local", error);
      }
    }
    
    // Local storage fallback
    const filename = FILE_PATTERNS.SIMULATION_RESULT(runId);
    const filePath = this.getFilePath("OUTPUT", filename);
    
    try {
      await fs.writeFile(filePath, csvData, "utf-8");
      logger.info(`Simulation result saved locally: ${filePath}`);
      return filePath;
    } catch (error) {
      logger.error(`Failed to save simulation result: ${filePath}`, error);
      throw error;
    }
  }

  /**
   * Save MOO ranking results
   */
  static async saveMooResult(runId: string, csvData: string): Promise<string> {
    if (this.useSupabase && this.supabaseInitialized) {
      try {
        return await S3StorageManager.saveMooResult(runId, csvData);
      } catch (error) {
        logger.error("Supabase upload failed, falling back to local", error);
      }
    }
    
    // Local storage fallback
    const filename = FILE_PATTERNS.MOO_RESULT(runId);
    const filePath = this.getFilePath("OUTPUT", filename);
    
    try {
      await fs.writeFile(filePath, csvData, "utf-8");
      logger.info(`MOO result saved locally: ${filePath}`);
      return filePath;
    } catch (error) {
      logger.error(`Failed to save MOO result: ${filePath}`, error);
      throw error;
    }
  }

  /**
   * Save final RL scheduling results
   */
  static async saveRlFinalResult(runId: string, csvData: string): Promise<string> {
    if (this.useSupabase && this.supabaseInitialized) {
      try {
        return await S3StorageManager.saveRlFinal(runId, csvData);
      } catch (error) {
        logger.error("Supabase upload failed, falling back to local", error);
      }
    }
    
    // Local storage fallback
    const filename = FILE_PATTERNS.RL_FINAL(runId);
    const filePath = this.getFilePath("OUTPUT", filename);
    
    try {
      await fs.writeFile(filePath, csvData, "utf-8");
      logger.info(`RL final result saved locally: ${filePath}`);
      return filePath;
    } catch (error) {
      logger.error(`Failed to save RL final result: ${filePath}`, error);
      throw error;
    }
  }

  /**
   * Read file content as string
   */
  static async readFile(filePath: string): Promise<string> {
    if (this.useSupabase && this.supabaseInitialized && !path.isAbsolute(filePath)) {
      try {
        return await S3StorageManager.readFileAsString(filePath);
      } catch (error) {
        logger.error("Supabase read failed, falling back to local", error);
      }
    }
    
    // Local storage fallback
    try {
      const content = await fs.readFile(filePath, "utf-8");
      logger.info(`File read locally: ${filePath}`);
      return content;
    } catch (error) {
      logger.error(`Failed to read file: ${filePath}`, error);
      throw error;
    }
  }

  /**
   * Read file content as buffer
   */
  static async readFileBuffer(filePath: string): Promise<Buffer> {
    if (this.useSupabase && this.supabaseInitialized && !path.isAbsolute(filePath)) {
      try {
        return await S3StorageManager.readFileBuffer(filePath);
      } catch (error) {
        logger.error("Supabase read failed, falling back to local", error);
      }
    }
    
    // Local storage fallback
    try {
      const buffer = await fs.readFile(filePath);
      logger.info(`File buffer read locally: ${filePath}`);
      return buffer;
    } catch (error) {
      logger.error(`Failed to read file buffer: ${filePath}`, error);
      throw error;
    }
  }

  /**
   * Check if file exists
   */
  static async fileExists(filePath: string): Promise<boolean> {
    if (this.useSupabase && this.supabaseInitialized && !path.isAbsolute(filePath)) {
      try {
        return await S3StorageManager.fileExists(filePath);
      } catch (error) {
        logger.error("Supabase file check failed, falling back to local", error);
      }
    }
    
    // Local storage fallback
    try {
      await fs.access(filePath);
      return true;
    } catch {
      return false;
    }
  }

  /**
   * Delete file
   */
  static async deleteFile(filePath: string): Promise<void> {
    if (this.useSupabase && this.supabaseInitialized && !path.isAbsolute(filePath)) {
      try {
        await S3StorageManager.deleteFile(filePath);
        return;
      } catch (error) {
        logger.error("Supabase delete failed, falling back to local", error);
      }
    }
    
    // Local storage fallback
    try {
      await fs.unlink(filePath);
      logger.info(`File deleted locally: ${filePath}`);
    } catch (error) {
      logger.error(`Failed to delete file: ${filePath}`, error);
      throw error;
    }
  }

  /**
   * Clean up old temporary files (older than specified hours)
   */
  static async cleanupTempFiles(hoursOld: number = 24): Promise<void> {
    if (this.useSupabase && this.supabaseInitialized) {
      try {
        await S3StorageManager.cleanupOldFiles("temp", hoursOld);
        return;
      } catch (error) {
        logger.error("Supabase cleanup failed, falling back to local", error);
      }
    }
    
    // Local storage fallback
    try {
      const tempDir = this.getStoragePath(STORAGE_PATHS.TEMP);
      const files = await fs.readdir(tempDir);
      const cutoffTime = Date.now() - (hoursOld * 60 * 60 * 1000);

      for (const file of files) {
        const filePath = path.join(tempDir, file);
        const stats = await fs.stat(filePath);
        
        if (stats.mtime.getTime() < cutoffTime) {
          await this.deleteFile(filePath);
          logger.info(`Cleaned up old temp file: ${filePath}`);
        }
      }
    } catch (error) {
      logger.error("Failed to cleanup temporary files", error);
    }
  }

  /**
   * Get storage usage statistics
   */
  static async getStorageStats(): Promise<{
    inputFiles: number;
    outputFiles: number;
    tempFiles: number;
  }> {
    if (this.useSupabase && this.supabaseInitialized) {
      try {
        return await S3StorageManager.getStorageStats();
      } catch (error) {
        logger.error("Supabase stats failed, falling back to local", error);
      }
    }
    
    // Local storage fallback
    try {
      const inputDir = this.getStoragePath(STORAGE_PATHS.INPUT);
      const outputDir = this.getStoragePath(STORAGE_PATHS.OUTPUT);
      const tempDir = this.getStoragePath(STORAGE_PATHS.TEMP);

      const [inputFiles, outputFiles, tempFiles] = await Promise.all([
        fs.readdir(inputDir).then(files => files.length).catch(() => 0),
        fs.readdir(outputDir).then(files => files.length).catch(() => 0),
        fs.readdir(tempDir).then(files => files.length).catch(() => 0)
      ]);

      return { inputFiles, outputFiles, tempFiles };
    } catch (error) {
      logger.error("Failed to get storage stats", error);
      return { inputFiles: 0, outputFiles: 0, tempFiles: 0 };
    }
  }

  /**
   * Get signed URL for file access (only available with S3)
   */
  static async getSignedUrl(filePath: string, expiresIn: number = 3600): Promise<string | null> {
    if (this.useSupabase && this.supabaseInitialized) {
      try {
        return await S3StorageManager.getSignedUrl(filePath, expiresIn);
      } catch (error) {
        logger.error("Failed to get signed URL", error);
        return null;
      }
    }
    
    logger.warn("Signed URLs are only available with Supabase Storage");
    return null;
  }

  /**
   * Get public URL for file access (only available with S3, files must be uploaded with public ACL)
   */
  static getPublicUrl(filePath: string): string | null {
    if (this.useSupabase && this.supabaseInitialized) {
      try {
        return S3StorageManager.getPublicUrl(filePath);
      } catch (error) {
        logger.error("Failed to get public URL", error);
        return null;
      }
    }
    
    logger.warn("Public URLs are only available with S3 Storage");
    return null;
  }
}