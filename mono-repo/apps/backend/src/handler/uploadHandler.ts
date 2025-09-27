import { type Request, type Response } from 'express';
import axios from 'axios';
import FormData from 'form-data';

interface UploadStatus {
  [key: string]: {
    status: 'processing' | 'completed' | 'failed';
    progress?: number;
    message?: string;
    results?: any;
  };
}

const uploadStatusMap: UploadStatus = {};

export const uploadCSV = async (req: Request, res: Response) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'No CSV file uploaded' });
    }

    const { days_to_simulate = 1 } = req.body; // default to 1 if not passed
    const jobId = `upload_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

    // Initialize job status
    uploadStatusMap[jobId] = {
      status: 'processing',
      progress: 0,
      message: 'Uploading CSV to pipeline service...'
    };

    // Build multipart form-data
    const formData = new FormData();
    formData.append('file', req.file.buffer, req.file.originalname);
    formData.append('days_to_simulate', days_to_simulate);

    // Send file to external API
    axios.post(`${process.env.BACKEND_BASE_URL}/api/pipeline/start-csv`, formData, {
      headers: formData.getHeaders(),
      maxContentLength: Infinity,
      maxBodyLength: Infinity,
    })
    .then(response => {
      uploadStatusMap[jobId] = {
        status: 'completed',
        message: 'CSV processed successfully',
        results: response.data
      };
    })
    .catch(error => {
      uploadStatusMap[jobId] = {
        status: 'failed',
        message: error.response?.data?.error || error.message
      };
    });

    res.json({
      message: 'CSV upload started',
      jobId,
      statusUrl: `/api/upload/upload-status/${jobId}`
    });

  } catch (error) {
    console.error('Upload error:', error);
    res.status(500).json({ error: 'Failed to process CSV upload' });
  }
};

export const getUploadStatus = (req: Request, res: Response) => {
  const { jobId } = req.params;
  const status = uploadStatusMap[jobId as string];

  if (!status) {
    return res.status(404).json({ error: 'Job not found' });
  }

  res.json(status);
};
