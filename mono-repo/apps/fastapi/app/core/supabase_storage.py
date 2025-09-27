"""
Supabase Storage Manager for FastAPI Service
Handles file uploads, downloads, and management via Supabase Storage
"""

import asyncio
import os
import time
from pathlib import Path
from typing import Optional, Dict, Any, List, Tuple
import pandas as pd
from supabase import create_client, Client
from app.core.config import settings
import aiofiles
import tempfile

class SupabaseStorageManager:
    """Supabase Storage utility class for managing pipeline files in FastAPI services"""
    
    # File naming patterns
    FILE_PATTERNS = {
        "USER_UPLOAD": lambda upload_id: f"input/user_upload_{upload_id}.csv",
        "SIMULATION_RESULT": lambda run_id: f"output/simulation_result_{run_id}.csv",
        "MOO_RESULT": lambda run_id: f"output/moo_result_{run_id}.csv",
        "RL_FINAL": lambda run_id: f"output/rl_final_{run_id}.csv",
        "TEMP_FILE": lambda run_id, suffix: f"temp/{run_id}_{suffix}.csv"
    }
    
    _client: Optional[Client] = None
    _initialized: bool = False
    
    @classmethod
    def initialize(cls, supabase_url: str, supabase_key: str, bucket_name: str) -> None:
        """Initialize Supabase client with configuration"""
        cls.supabase_url = supabase_url
        cls.supabase_key = supabase_key
        cls.bucket_name = bucket_name
        
        # Create Supabase client
        cls._client = create_client(supabase_url, supabase_key)
        cls._initialized = True
        
        print(f"[Supabase Storage] Manager initialized for bucket: {bucket_name}")
    
    @classmethod
    async def initialize_storage(cls) -> None:
        """Initialize storage bucket and ensure it exists"""
        if not cls._initialized or not cls._client:
            raise RuntimeError("SupabaseStorageManager not initialized. Call initialize() first.")
        
        try:
            # Check if bucket exists
            buckets_response = cls._client.storage.list_buckets()
            existing_buckets = [bucket.name for bucket in buckets_response]
            
            if cls.bucket_name not in existing_buckets:
                # Create bucket with proper configuration
                result = cls._client.storage.create_bucket(
                    cls.bucket_name,
                    options={
                        "public": False,  # Private bucket for security
                        "allowedMimeTypes": ["text/csv", "application/csv"],
                        "fileSizeLimit": 52428800,  # 50MB limit
                    }
                )
                print(f"[Supabase Storage] Bucket created: {cls.bucket_name}")
            
            # Ensure directory structure exists (create dummy files to establish paths)
            await cls._ensure_directory_structure()
            
            print("[Supabase Storage] Storage initialization completed successfully")
            
        except Exception as e:
            print(f"[Supabase Storage] Failed to initialize storage: {e}")
            raise
    
    @classmethod
    async def _ensure_directory_structure(cls) -> None:
        """Ensure directory structure exists in Supabase Storage"""
        directories = ["input", "output", "temp"]
        
        for directory in directories:
            try:
                # Create a temporary placeholder file to establish the directory
                placeholder_path = f"{directory}/.placeholder"
                placeholder_content = "# Directory placeholder file"
                
                # Upload placeholder if it doesn't exist
                result = cls._client.storage.from_(cls.bucket_name).upload(
                    placeholder_path,
                    placeholder_content.encode(),
                    file_options={"content-type": "text/plain", "upsert": True}
                )
                print(f"[Supabase Storage] Directory ensured: {directory}/")
                
            except Exception as e:
                # Directory might already exist, which is fine
                print(f"[Supabase Storage] Directory {directory}/ status: {str(e)}")
    
    @classmethod
    async def upload_file(cls, file_path: str, content: bytes, content_type: str = "text/csv") -> str:
        """Upload file content to Supabase Storage"""
        if not cls._initialized or not cls._client:
            raise RuntimeError("SupabaseStorageManager not initialized")
        
        try:
            result = cls._client.storage.from_(cls.bucket_name).upload(
                file_path,
                content,
                file_options={
                    "content-type": content_type,
                    "upsert": True,  # Overwrite if exists
                    "cache-control": "3600"
                }
            )
            
            print(f"[Supabase Storage] File uploaded: {file_path}")
            return file_path
            
        except Exception as e:
            print(f"[Supabase Storage] Upload failed for {file_path}: {e}")
            raise
    
    @classmethod
    async def download_file(cls, file_path: str) -> bytes:
        """Download file content from Supabase Storage"""
        if not cls._initialized or not cls._client:
            raise RuntimeError("SupabaseStorageManager not initialized")
        
        try:
            result = cls._client.storage.from_(cls.bucket_name).download(file_path)
            
            if not result:
                raise FileNotFoundError(f"File not found: {file_path}")
            
            print(f"[Supabase Storage] File downloaded: {file_path} ({len(result)} bytes)")
            return result
            
        except Exception as e:
            print(f"[Supabase Storage] Download failed for {file_path}: {e}")
            raise
    
    @classmethod
    async def get_signed_url(cls, file_path: str, expires_in: int = 3600) -> str:
        """Get signed URL for file access"""
        if not cls._initialized or not cls._client:
            raise RuntimeError("SupabaseStorageManager not initialized")
        
        try:
            result = cls._client.storage.from_(cls.bucket_name).create_signed_url(
                file_path, expires_in
            )
            
            if not result or "signedURL" not in result:
                raise Exception(f"Failed to generate signed URL for: {file_path}")
            
            signed_url = result["signedURL"]
            print(f"[Supabase Storage] Signed URL created for: {file_path} (expires in {expires_in}s)")
            return signed_url
            
        except Exception as e:
            print(f"[Supabase Storage] Signed URL creation failed for {file_path}: {e}")
            raise
    
    @classmethod
    async def file_exists(cls, file_path: str) -> bool:
        """Check if file exists in storage"""
        if not cls._initialized or not cls._client:
            return False
        
        try:
            # Try to get file info
            path_parts = file_path.split('/')
            directory = '/'.join(path_parts[:-1]) if len(path_parts) > 1 else ''
            filename = path_parts[-1]
            
            result = cls._client.storage.from_(cls.bucket_name).list(directory)
            
            if result:
                return any(file.get('name') == filename for file in result)
            
            return False
            
        except Exception:
            return False
    
    @classmethod
    async def delete_file(cls, file_path: str) -> None:
        """Delete file from storage"""
        if not cls._initialized or not cls._client:
            raise RuntimeError("SupabaseStorageManager not initialized")
        
        try:
            result = cls._client.storage.from_(cls.bucket_name).remove([file_path])
            print(f"[Supabase Storage] File deleted: {file_path}")
            
        except Exception as e:
            print(f"[Supabase Storage] Delete failed for {file_path}: {e}")
            raise
    
    @classmethod
    async def list_files(cls, directory: str = "") -> List[Dict[str, Any]]:
        """List files in a directory"""
        if not cls._initialized or not cls._client:
            raise RuntimeError("SupabaseStorageManager not initialized")
        
        try:
            result = cls._client.storage.from_(cls.bucket_name).list(directory)
            
            files = []
            for file_info in result:
                if file_info.get('name') and not file_info['name'].startswith('.'):
                    files.append({
                        'name': file_info['name'],
                        'size': file_info.get('metadata', {}).get('size', 0),
                        'last_modified': file_info.get('updated_at', file_info.get('created_at'))
                    })
            
            return files
            
        except Exception as e:
            print(f"[Supabase Storage] List files failed for {directory}: {e}")
            return []
    
    @classmethod
    async def read_csv_from_path(cls, file_path: str) -> pd.DataFrame:
        """Read CSV file from Supabase Storage and return DataFrame"""
        try:
            file_content = await cls.download_file(file_path)
            
            # Create a temporary file to read with pandas
            with tempfile.NamedTemporaryFile(mode='wb', suffix='.csv', delete=False) as temp_file:
                temp_file.write(file_content)
                temp_file_path = temp_file.name
            
            try:
                df = pd.read_csv(temp_file_path)
                print(f"[Supabase Storage] CSV loaded from: {file_path} ({len(df)} rows)")
                return df
            finally:
                # Clean up temporary file
                os.unlink(temp_file_path)
                
        except Exception as e:
            print(f"[Supabase Storage] Failed to read CSV from {file_path}: {e}")
            raise
    
    @classmethod
    async def save_csv_to_storage(cls, df: pd.DataFrame, file_path: str) -> str:
        """Save DataFrame as CSV to Supabase Storage and return file path"""
        try:
            # Create a temporary file to write the CSV
            with tempfile.NamedTemporaryFile(mode='w', suffix='.csv', delete=False, newline='', encoding='utf-8') as temp_file:
                df.to_csv(temp_file.name, index=False)
                temp_file_path = temp_file.name
            
            try:
                # Read the temporary file as bytes
                async with aiofiles.open(temp_file_path, mode='rb') as f:
                    file_content = await f.read()
                
                # Upload to Supabase Storage
                await cls.upload_file(file_path, file_content, "text/csv")
                print(f"[Supabase Storage] CSV saved to: {file_path} ({len(df)} rows)")
                return file_path
                
            finally:
                # Clean up temporary file
                os.unlink(temp_file_path)
                
        except Exception as e:
            print(f"[Supabase Storage] Failed to save CSV: {e}")
            raise
    
    @classmethod
    async def save_user_upload(cls, upload_id: str, csv_content: str) -> str:
        """Save initial train data for pipeline processing"""
        file_path = cls.FILE_PATTERNS["USER_UPLOAD"](upload_id)
        await cls.upload_file(file_path, csv_content.encode('utf-8'), "text/csv")
        return file_path
    
    @classmethod
    async def save_simulation_result(cls, run_id: str, df: pd.DataFrame) -> str:
        """Save simulation results"""
        file_path = cls.FILE_PATTERNS["SIMULATION_RESULT"](run_id)
        return await cls.save_csv_to_storage(df, file_path)
    
    @classmethod
    async def save_moo_result(cls, run_id: str, df: pd.DataFrame) -> str:
        """Save MOO results"""
        file_path = cls.FILE_PATTERNS["MOO_RESULT"](run_id)
        return await cls.save_csv_to_storage(df, file_path)
    
    @classmethod
    async def save_rl_final(cls, run_id: str, df: pd.DataFrame) -> str:
        """Save RL final results"""
        file_path = cls.FILE_PATTERNS["RL_FINAL"](run_id)
        return await cls.save_csv_to_storage(df, file_path)
    
    @classmethod
    async def cleanup_old_files(cls, directory: str = "temp", hours_old: int = 24) -> None:
        """Clean up old files (older than specified hours)"""
        if not cls._initialized or not cls._client:
            return
        
        try:
            files = await cls.list_files(directory)
            cutoff_time = time.time() - (hours_old * 3600)
            
            files_to_delete = []
            for file_info in files:
                if file_info.get('last_modified'):
                    # Parse timestamp and compare
                    file_time = pd.to_datetime(file_info['last_modified']).timestamp()
                    if file_time < cutoff_time:
                        file_path = f"{directory}/{file_info['name']}" if directory else file_info['name']
                        files_to_delete.append(file_path)
            
            if files_to_delete:
                for file_path in files_to_delete:
                    try:
                        await cls.delete_file(file_path)
                    except Exception as e:
                        print(f"[Supabase Storage] Failed to delete {file_path}: {e}")
                
                print(f"[Supabase Storage] Cleaned up {len(files_to_delete)} old files from {directory}")
            
        except Exception as e:
            print(f"[Supabase Storage] Failed to cleanup old files: {e}")
    
    @classmethod
    async def get_storage_stats(cls) -> Dict[str, int]:
        """Get storage usage statistics"""
        try:
            input_files = await cls.list_files("input")
            output_files = await cls.list_files("output")
            temp_files = await cls.list_files("temp")
            
            return {
                "input_files": len([f for f in input_files if not f['name'].startswith('.')]),
                "output_files": len([f for f in output_files if not f['name'].startswith('.')]),
                "temp_files": len([f for f in temp_files if not f['name'].startswith('.')])
            }
            
        except Exception as e:
            print(f"[Supabase Storage] Failed to get storage stats: {e}")
            return {"input_files": 0, "output_files": 0, "temp_files": 0}