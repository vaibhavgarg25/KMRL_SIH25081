"""
AWS S3 Storage Manager for FastAPI Service
Handles file uploads, downloads, and management via AWS S3
"""

import asyncio
import os
import time
from pathlib import Path
from typing import Optional, Dict, Any, List
import pandas as pd
import tempfile
import aiofiles
import boto3
from botocore.exceptions import ClientError, NoCredentialsError
from app.core.config import settings

class S3StorageManager:
    """AWS S3 Storage utility class for managing pipeline files in FastAPI services"""
    
    # File naming patterns
    FILE_PATTERNS = {
        "USER_UPLOAD": lambda upload_id: f"input/user_upload_{upload_id}.csv",
        "SIMULATION_RESULT": lambda run_id: f"output/simulation_result_{run_id}.csv",
        "MOO_RESULT": lambda run_id: f"output/moo_result_{run_id}.csv",
        "RL_FINAL": lambda run_id: f"output/rl_final_{run_id}.csv",
        "TEMP_FILE": lambda run_id, suffix: f"temp/{run_id}_{suffix}.csv"
    }
    
    _s3_client = None
    _initialized: bool = False
    _bucket_name: str = ""
    
    @classmethod
    def initialize(cls, access_key_id: str, secret_access_key: str, region: str, bucket_name: str, endpoint_url: str = None) -> None:
        """Initialize S3 client with configuration"""
        cls.access_key_id = access_key_id
        cls.secret_access_key = secret_access_key
        cls.region = region
        cls.bucket_name = bucket_name
        cls._bucket_name = bucket_name
        cls.endpoint_url = endpoint_url
        
        # Create S3 client
        session = boto3.Session(
            aws_access_key_id=access_key_id,
            aws_secret_access_key=secret_access_key,
            region_name=region
        )
        
        client_config = {}
        if endpoint_url:
            client_config['endpoint_url'] = endpoint_url
            
        cls._s3_client = session.client('s3', **client_config)
        cls._initialized = True
        
        print(f"[S3 Storage] Manager initialized for bucket: {bucket_name} in region: {region}")
    
    @classmethod
    async def initialize_storage(cls) -> None:
        """Initialize storage bucket and ensure directory structure exists"""
        if not cls._initialized or not cls._s3_client:
            raise RuntimeError("S3StorageManager not initialized. Call initialize() first.")
        
        try:
            # Check if bucket exists (and create if it doesn't)
            try:
                cls._s3_client.head_bucket(Bucket=cls.bucket_name)
                print(f"[S3 Storage] Using existing bucket: {cls.bucket_name}")
            except ClientError as e:
                error_code = int(e.response['Error']['Code'])
                if error_code == 404:
                    # Bucket doesn't exist, create it
                    if cls.region == 'us-east-1':
                        cls._s3_client.create_bucket(Bucket=cls.bucket_name)
                    else:
                        cls._s3_client.create_bucket(
                            Bucket=cls.bucket_name,
                            CreateBucketConfiguration={'LocationConstraint': cls.region}
                        )
                    print(f"[S3 Storage] Bucket created: {cls.bucket_name}")
                else:
                    raise
            
            # Ensure directory structure exists (create placeholder files)
            await cls._ensure_directory_structure()
            
            print("[S3 Storage] Storage initialization completed successfully")
            
        except Exception as e:
            print(f"[S3 Storage] Failed to initialize storage: {e}")
            raise
    
    @classmethod
    async def _ensure_directory_structure(cls) -> None:
        """Ensure directory structure exists in S3"""
        directories = ["input", "output", "temp"]
        
        for directory in directories:
            try:
                # Create a temporary placeholder file to establish the directory
                placeholder_key = f"{directory}/.placeholder"
                placeholder_content = "# Directory placeholder file"
                
                # Upload placeholder if it doesn't exist
                try:
                    cls._s3_client.head_object(Bucket=cls.bucket_name, Key=placeholder_key)
                except ClientError as e:
                    if e.response['Error']['Code'] == '404':
                        # Object doesn't exist, create it
                        cls._s3_client.put_object(
                            Bucket=cls.bucket_name,
                            Key=placeholder_key,
                            Body=placeholder_content.encode(),
                            ContentType='text/plain'
                        )
                        print(f"[S3 Storage] Directory ensured: {directory}/")
                    else:
                        raise
                
            except Exception as e:
                # Directory might already exist, which is fine
                print(f"[S3 Storage] Directory {directory}/ status: {str(e)}")
    
    @classmethod
    async def upload_file(cls, file_path: str, content: bytes, content_type: str = "text/csv") -> str:
        """Upload file content to S3"""
        if not cls._initialized or not cls._s3_client:
            raise RuntimeError("S3StorageManager not initialized")
        
        try:
            cls._s3_client.put_object(
                Bucket=cls.bucket_name,
                Key=file_path,
                Body=content,
                ContentType=content_type,
                ServerSideEncryption='AES256',  # Enable server-side encryption
                ACL='public-read'  # Make files publicly accessible
            )
            
            print(f"[S3 Storage] File uploaded with public access: {file_path}")
            return file_path
            
        except Exception as e:
            print(f"[S3 Storage] Upload failed for {file_path}: {e}")
            raise
    
    @classmethod
    async def download_file(cls, file_path: str) -> bytes:
        """Download file content from S3"""
        if not cls._initialized or not cls._s3_client:
            raise RuntimeError("S3StorageManager not initialized")
        
        try:
            response = cls._s3_client.get_object(Bucket=cls.bucket_name, Key=file_path)
            content = response['Body'].read()
            
            print(f"[S3 Storage] File downloaded: {file_path} ({len(content)} bytes)")
            return content
            
        except ClientError as e:
            if e.response['Error']['Code'] == 'NoSuchKey':
                raise FileNotFoundError(f"File not found: {file_path}")
            else:
                print(f"[S3 Storage] Download failed for {file_path}: {e}")
                raise
        except Exception as e:
            print(f"[S3 Storage] Download failed for {file_path}: {e}")
            raise
    
    @classmethod
    async def get_signed_url(cls, file_path: str, expires_in: int = 3600) -> str:
        """Get signed URL for file access"""
        if not cls._initialized or not cls._s3_client:
            raise RuntimeError("S3StorageManager not initialized")
        
        try:
            signed_url = cls._s3_client.generate_presigned_url(
                'get_object',
                Params={'Bucket': cls.bucket_name, 'Key': file_path},
                ExpiresIn=expires_in
            )
            
            print(f"[S3 Storage] Signed URL created for: {file_path} (expires in {expires_in}s)")
            return signed_url
            
        except Exception as e:
            print(f"[S3 Storage] Signed URL creation failed for {file_path}: {e}")
            raise
    
    @classmethod
    def get_public_url(cls, file_path: str) -> str:
        """Get public URL for file access (files uploaded with public-read ACL)"""
        if not cls._initialized:
            raise RuntimeError("S3StorageManager not initialized")
        
        base_url = cls.endpoint_url or f"https://s3.{cls.region}.amazonaws.com"
        public_url = f"{base_url}/{cls.bucket_name}/{file_path}"
        
        print(f"[S3 Storage] Public URL generated for: {file_path}")
        return public_url
    
    @classmethod
    async def file_exists(cls, file_path: str) -> bool:
        """Check if file exists in storage"""
        if not cls._initialized or not cls._s3_client:
            return False
        
        try:
            cls._s3_client.head_object(Bucket=cls.bucket_name, Key=file_path)
            return True
        except ClientError as e:
            if e.response['Error']['Code'] == '404':
                return False
            else:
                raise
        except Exception:
            return False
    
    @classmethod
    async def delete_file(cls, file_path: str) -> None:
        """Delete file from storage"""
        if not cls._initialized or not cls._s3_client:
            raise RuntimeError("S3StorageManager not initialized")
        
        try:
            cls._s3_client.delete_object(Bucket=cls.bucket_name, Key=file_path)
            print(f"[S3 Storage] File deleted: {file_path}")
            
        except Exception as e:
            print(f"[S3 Storage] Delete failed for {file_path}: {e}")
            raise
    
    @classmethod
    async def list_files(cls, prefix: str = "") -> List[Dict[str, Any]]:
        """List files in a directory"""
        if not cls._initialized or not cls._s3_client:
            raise RuntimeError("S3StorageManager not initialized")
        
        try:
            response = cls._s3_client.list_objects_v2(
                Bucket=cls.bucket_name,
                Prefix=prefix,
                Delimiter='/'
            )
            
            files = []
            for obj in response.get('Contents', []):
                if not obj['Key'].endswith('.placeholder'):
                    files.append({
                        'name': obj['Key'].split('/')[-1],
                        'size': obj['Size'],
                        'last_modified': obj['LastModified'].isoformat()
                    })
            
            return files
            
        except Exception as e:
            print(f"[S3 Storage] List files failed for {prefix}: {e}")
            return []
    
    @classmethod
    async def read_csv_from_path(cls, file_path: str) -> pd.DataFrame:
        """Read CSV file from S3 and return DataFrame"""
        try:
            file_content = await cls.download_file(file_path)
            
            # Create a temporary file to read with pandas
            with tempfile.NamedTemporaryFile(mode='wb', suffix='.csv', delete=False) as temp_file:
                temp_file.write(file_content)
                temp_file_path = temp_file.name
            
            try:
                df = pd.read_csv(temp_file_path)
                print(f"[S3 Storage] CSV loaded from: {file_path} ({len(df)} rows)")
                return df
            finally:
                # Clean up temporary file
                os.unlink(temp_file_path)
                
        except Exception as e:
            print(f"[S3 Storage] Failed to read CSV from {file_path}: {e}")
            raise
    
    @classmethod
    async def save_csv_to_storage(cls, df: pd.DataFrame, file_path: str) -> str:
        """Save DataFrame as CSV to S3 and return file path"""
        try:
            # Create a temporary file to write the CSV
            with tempfile.NamedTemporaryFile(mode='w', suffix='.csv', delete=False, newline='', encoding='utf-8') as temp_file:
                df.to_csv(temp_file.name, index=False)
                temp_file_path = temp_file.name
            
            try:
                # Read the temporary file as bytes
                async with aiofiles.open(temp_file_path, mode='rb') as f:
                    file_content = await f.read()
                
                # Upload to S3
                await cls.upload_file(file_path, file_content, "text/csv")
                print(f"[S3 Storage] CSV saved to: {file_path} ({len(df)} rows)")
                return file_path
                
            finally:
                # Clean up temporary file
                os.unlink(temp_file_path)
                
        except Exception as e:
            print(f"[S3 Storage] Failed to save CSV: {e}")
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
    async def cleanup_old_files(cls, prefix: str = "temp", hours_old: int = 24) -> None:
        """Clean up old files (older than specified hours)"""
        if not cls._initialized or not cls._s3_client:
            return
        
        try:
            files = await cls.list_files(f"{prefix}/")
            cutoff_time = time.time() - (hours_old * 3600)
            
            files_to_delete = []
            for file_info in files:
                if file_info.get('last_modified'):
                    # Parse timestamp and compare
                    file_time = pd.to_datetime(file_info['last_modified']).timestamp()
                    if file_time < cutoff_time:
                        file_path = f"{prefix}/{file_info['name']}"
                        files_to_delete.append(file_path)
            
            if files_to_delete:
                for file_path in files_to_delete:
                    try:
                        await cls.delete_file(file_path)
                    except Exception as e:
                        print(f"[S3 Storage] Failed to delete {file_path}: {e}")
                
                print(f"[S3 Storage] Cleaned up {len(files_to_delete)} old files from {prefix}")
            
        except Exception as e:
            print(f"[S3 Storage] Failed to cleanup old files: {e}")
    
    @classmethod
    async def get_storage_stats(cls) -> Dict[str, int]:
        """Get storage usage statistics"""
        try:
            input_files = await cls.list_files("input/")
            output_files = await cls.list_files("output/")
            temp_files = await cls.list_files("temp/")
            
            return {
                "input_files": len([f for f in input_files if not f['name'].startswith('.')]),
                "output_files": len([f for f in output_files if not f['name'].startswith('.')]),
                "temp_files": len([f for f in temp_files if not f['name'].startswith('.')])
            }
            
        except Exception as e:
            print(f"[S3 Storage] Failed to get storage stats: {e}")
            return {"input_files": 0, "output_files": 0, "temp_files": 0}