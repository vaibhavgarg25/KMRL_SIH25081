import { S3Client, PutObjectCommand, GetObjectCommand, DeleteObjectCommand, ListObjectsV2Command, HeadObjectCommand, type _Object } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import { logger } from "../config/logger.js";

/**
 * AWS S3 Storage Manager for Backend Service
 * Handles file uploads, downloads, and management via AWS S3
 */

export interface S3StorageConfig {
  accessKeyId: string;
  secretAccessKey: string;
  region: string;
  bucketName: string;
  endpoint?: string; // Optional custom endpoint
}

// File naming conventions for pipeline
export const FILE_PATTERNS = {
  USER_UPLOAD: (uploadId: string) => `input/user_upload_${uploadId}.csv`,
  SIMULATION_RESULT: (runId: string) => `output/simulation_result_${runId}.csv`,
  MOO_RESULT: (runId: string) => `output/moo_result_${runId}.csv`,
  RL_FINAL: (runId: string) => `output/rl_final_${runId}.csv`,
  TEMP_FILE: (runId: string, suffix: string) => `temp/${runId}_${suffix}.csv`
} as const;

/**
 * AWS S3 Storage utility class for managing pipeline files
 */
export class S3StorageManager {
  private static s3Client: S3Client;
  private static config: S3StorageConfig;
  private static initialized = false;

  /**
   * Initialize S3 client with configuration
   */
  static initialize(config: S3StorageConfig): void {
    this.config = config;
    
    const clientConfig: any = {
      region: config.region,
      credentials: {
        accessKeyId: config.accessKeyId,
        secretAccessKey: config.secretAccessKey,
      },
    };
    
    // Add custom endpoint if provided (for S3-compatible services)
    if (config.endpoint) {
      clientConfig.endpoint = config.endpoint;
      clientConfig.forcePathStyle = true; // Required for some S3-compatible services
    }
    
    this.s3Client = new S3Client(clientConfig);
    this.initialized = true;
    
    logger.info("S3 Storage Manager initialized", { 
      bucketName: config.bucketName,
      region: config.region,
      hasCustomEndpoint: !!config.endpoint 
    });
  }

  /**
   * Ensure bucket exists and create directory placeholders
   */
  static async initializeStorage(): Promise<void> {
    if (!this.initialized) {
      throw new Error("S3StorageManager not initialized. Call initialize() first.");
    }

    try {
      // Create directory placeholder files to establish folder structure
      const directories = ['input/', 'output/', 'temp/'];
      
      for (const dir of directories) {
        try {
          const command = new PutObjectCommand({
            Bucket: this.config.bucketName,
            Key: `${dir}.placeholder`,
            Body: '# Directory placeholder',
            ContentType: 'text/plain',
          });
          
          await this.s3Client.send(command);
          logger.info(`S3 directory ensured: ${dir}`);
        } catch (error: any) {
          // Directory might already exist, which is fine
          if (error.name !== 'NoSuchBucket') {
            logger.warn(`Could not create directory ${dir}:`, error.message);
          }
        }
      }

      logger.info("S3 storage initialization completed");
    } catch (error) {
      logger.error("Failed to initialize S3 storage", error);
      throw error;
    }
  }

  /**
   * Upload file content to S3
   */
  static async uploadFile(filePath: string, content: string | Buffer, contentType: string = 'text/csv'): Promise<string> {
    if (!this.initialized) {
      throw new Error("S3StorageManager not initialized");
    }

    try {
      const command = new PutObjectCommand({
        Bucket: this.config.bucketName,
        Key: filePath,
        Body: content,
        ContentType: contentType,
        ServerSideEncryption: 'AES256', // Enable server-side encryption
        ACL: 'public-read', // Make files publicly accessible
      });

      await this.s3Client.send(command);
      logger.info(`File uploaded successfully to S3 with public access: ${filePath}`);
      return filePath;
    } catch (error) {
      logger.error(`S3 upload failed for ${filePath}:`, error);
      throw error;
    }
  }

  /**
   * Download file content from S3
   */
  static async downloadFile(filePath: string): Promise<Buffer> {
    if (!this.initialized) {
      throw new Error("S3StorageManager not initialized");
    }

    try {
      const command = new GetObjectCommand({
        Bucket: this.config.bucketName,
        Key: filePath,
      });

      const response = await this.s3Client.send(command);
      
      if (!response.Body) {
        throw new Error(`File not found: ${filePath}`);
      }

      const chunks: Uint8Array[] = [];
      const reader = response.Body.transformToWebStream().getReader();
      
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        chunks.push(value);
      }
      
      const buffer = Buffer.concat(chunks);
      logger.info(`File downloaded successfully from S3: ${filePath} (${buffer.length} bytes)`);
      return buffer;
    } catch (error) {
      logger.error(`S3 download failed for ${filePath}:`, error);
      throw error;
    }
  }

  /**
   * Get signed URL for file access (for external services)
   */
  static async getSignedUrl(filePath: string, expiresIn: number = 3600): Promise<string> {
    if (!this.initialized) {
      throw new Error("S3StorageManager not initialized");
    }

    try {
      const command = new GetObjectCommand({
        Bucket: this.config.bucketName,
        Key: filePath,
      });

      const signedUrl = await getSignedUrl(this.s3Client, command, { expiresIn });
      logger.info(`Signed URL created for: ${filePath} (expires in ${expiresIn}s)`);
      return signedUrl;
    } catch (error) {
      logger.error(`Signed URL creation failed for ${filePath}:`, error);
      throw error;
    }
  }

  /**
   * Get public URL for file access (files uploaded with public-read ACL)
   */
  static getPublicUrl(filePath: string): string {
    if (!this.initialized) {
      throw new Error("S3StorageManager not initialized");
    }

    const baseUrl = this.config.endpoint || `https://s3.${this.config.region}.amazonaws.com`;
    const publicUrl = `${baseUrl}/${this.config.bucketName}/${filePath}`;
    
    logger.info(`Public URL generated for: ${filePath}`);
    return publicUrl;
  }

  /**
   * Save initial train data for pipeline processing
   */
  static async saveUserUpload(uploadId: string, csvData: string): Promise<string> {
    const filePath = FILE_PATTERNS.USER_UPLOAD(uploadId);
    await this.uploadFile(filePath, csvData, 'text/csv');
    return filePath;
  }

  /**
   * Save simulation results
   */
  static async saveSimulationResult(runId: string, csvData: string): Promise<string> {
    const filePath = FILE_PATTERNS.SIMULATION_RESULT(runId);
    await this.uploadFile(filePath, csvData, 'text/csv');
    return filePath;
  }

  /**
   * Save MOO results
   */
  static async saveMooResult(runId: string, csvData: string): Promise<string> {
    const filePath = FILE_PATTERNS.MOO_RESULT(runId);
    await this.uploadFile(filePath, csvData, 'text/csv');
    return filePath;
  }

  /**
   * Save RL final results
   */
  static async saveRlFinal(runId: string, csvData: string): Promise<string> {
    const filePath = FILE_PATTERNS.RL_FINAL(runId);
    await this.uploadFile(filePath, csvData, 'text/csv');
    return filePath;
  }

  /**
   * Read file content as string
   */
  static async readFileAsString(filePath: string): Promise<string> {
    const buffer = await this.downloadFile(filePath);
    return buffer.toString('utf-8');
  }

  /**
   * Read file content as buffer
   */
  static async readFileBuffer(filePath: string): Promise<Buffer> {
    return await this.downloadFile(filePath);
  }

  /**
   * Check if file exists
   */
  static async fileExists(filePath: string): Promise<boolean> {
    try {
      const command = new HeadObjectCommand({
        Bucket: this.config.bucketName,
        Key: filePath,
      });

      await this.s3Client.send(command);
      return true;
    } catch (error: any) {
      if (error.name === 'NotFound' || error.name === 'NoSuchKey') {
        return false;
      }
      throw error;
    }
  }

  /**
   * Delete file
   */
  static async deleteFile(filePath: string): Promise<void> {
    if (!this.initialized) {
      throw new Error("S3StorageManager not initialized");
    }

    try {
      const command = new DeleteObjectCommand({
        Bucket: this.config.bucketName,
        Key: filePath,
      });

      await this.s3Client.send(command);
      logger.info(`File deleted from S3: ${filePath}`);
    } catch (error) {
      logger.error(`S3 delete failed for ${filePath}:`, error);
      throw error;
    }
  }

  /**
   * List files in a directory
   */
  static async listFiles(directory: string = ''): Promise<Array<{ name: string; size: number; lastModified: Date }>> {
    if (!this.initialized) {
      throw new Error("S3StorageManager not initialized");
    }

    try {
      const command = new ListObjectsV2Command({
        Bucket: this.config.bucketName,
        Prefix: directory,
        Delimiter: '/',
      });

      const response = await this.s3Client.send(command);
      
      return (response.Contents || [])
        .filter((obj) => obj.Key && !obj.Key.endsWith('.placeholder'))
        .map((obj) => ({
          name: obj.Key!.split('/').pop() || obj.Key!,
          size: obj.Size || 0,
          lastModified: obj.LastModified || new Date(),
        }));
    } catch (error) {
      logger.error(`S3 list files failed for ${directory}:`, error);
      throw error;
    }
  }

  /**
   * Clean up old files (older than specified hours)
   */
  static async cleanupOldFiles(directory: string = 'temp', hoursOld: number = 24): Promise<void> {
    if (!this.initialized) {
      throw new Error("S3StorageManager not initialized");
    }

    try {
      const files = await this.listFiles(`${directory}/`);
      const cutoffTime = new Date(Date.now() - (hoursOld * 60 * 60 * 1000));

      const filesToDelete = files
        .filter(file => file.lastModified < cutoffTime)
        .map(file => `${directory}/${file.name}`);

      for (const filePath of filesToDelete) {
        try {
          await this.deleteFile(filePath);
          logger.info(`Cleaned up old S3 file: ${filePath}`);
        } catch (error) {
          logger.error(`Failed to delete old file ${filePath}:`, error);
        }
      }

      if (filesToDelete.length > 0) {
        logger.info(`Cleaned up ${filesToDelete.length} old files from S3 ${directory}`);
      }
    } catch (error) {
      logger.error("Failed to cleanup old S3 files", error);
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
    try {
      const [inputFiles, outputFiles, tempFiles] = await Promise.all([
        this.listFiles('input/').then(files => files.length).catch(() => 0),
        this.listFiles('output/').then(files => files.length).catch(() => 0),
        this.listFiles('temp/').then(files => files.length).catch(() => 0)
      ]);

      return { inputFiles, outputFiles, tempFiles };
    } catch (error) {
      logger.error("Failed to get S3 storage stats", error);
      return { inputFiles: 0, outputFiles: 0, tempFiles: 0 };
    }
  }
}