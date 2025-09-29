import os
import io
import csv
import json
import sys
import tempfile
import subprocess
from pathlib import Path
import pandas as pd
import httpx  # 👈 Async HTTP client
from typing import List, Dict, Any
from fastapi import HTTPException, UploadFile
from fastapi.responses import StreamingResponse
from app.api.rl.models import RLRequest, RLResponse, RLConfig
from app.core.storage import StorageManager
from app.core.config import settings


class RLHandler:
    WEBHOOK_URL = settings.WEBHOOK_RL_URL

    @staticmethod
    async def schedule_from_file_path(
        file_path: str,
        config: RLRequest,
        runId: str
    ) -> dict:
        """
        Start RL scheduling from file path using the new RL.py implementation.
        Saves results to organized RL output folder and sends webhook notification.
        """
        try:
            # Step 1: Log pipeline stage start
            await StorageManager.save_pipeline_log(runId, "rl_start", {
                "message": "RL scheduling started",
                "input_file_path": file_path,
                "config": config.dict()
            })
            
            # Step 2: Load CSV from MOO output
            df = await StorageManager.read_csv_from_path(file_path)
            print(f"[RL] Loaded MOO result: {len(df)} trains from {file_path}")
            
            # Step 3: Save CSV temporarily for RL.py processing
            with tempfile.NamedTemporaryFile(mode='w', suffix='.csv', delete=False, newline='') as temp_file:
                temp_path = temp_file.name
                df.to_csv(temp_file, index=False)
            
            # Step 4: Run RL.py in inference mode
            rl_script_path = Path(__file__).parent / "RL.py"
            
            # Use Windows-compatible temp directory
            temp_dir = tempfile.gettempdir()
            result_path = os.path.join(temp_dir, f"rl_result_{runId}.csv")
            
            # Ensure temp directory exists
            os.makedirs(temp_dir, exist_ok=True)
            
            # Execute RL.py with subprocess
            cmd = [
                sys.executable, str(rl_script_path),
                "--mode", "infer",
                "--csv", temp_path,
                "--out", result_path
            ]
            
            print(f"[RL] Running command: {' '.join(cmd)}")
            result = subprocess.run(cmd, capture_output=True, text=True, timeout=60)
            
            if result.returncode != 0:
                error_msg = f"RL processing failed: {result.stderr}"
                print(f"[RL Error] {error_msg}")
                raise Exception(error_msg)
            
            print(f"[RL] RL.py completed successfully. Output: {result.stdout}")
            
            # Step 5: Load the result CSV
            if not os.path.exists(result_path):
                raise Exception(f"RL result file not found at {result_path}")
                
            result_df = pd.read_csv(result_path)
            print(f"[RL] Result loaded: {len(result_df)} trains with scheduling")
            
            # Step 6: Save result to organized RL output folder
            final_result_path = await StorageManager.save_rl_result(runId, result_df)
            print(f"[RL] Final result saved to: {final_result_path}")
            
            # Step 7: Log pipeline stage completion
            await StorageManager.save_pipeline_log(runId, "rl_complete", {
                "message": "RL scheduling completed successfully",
                "input_file_path": file_path,
                "output_file_path": final_result_path,
                "total_trains": len(result_df),
                "trains_in_service": len(result_df[result_df.get("OperationalStatus", "") == "in_service"]),
                "trains_under_maintenance": len(result_df[result_df.get("OperationalStatus", "") == "under_maintenance"]),
                "trains_standby": len(result_df[result_df.get("OperationalStatus", "") == "standby"])
            })
            
            # Step 8: Send webhook notification
            await RLHandler._send_webhook(runId, final_result_path, "success")
            
            # Step 9: Cleanup temporary files
            cleanup_files = [temp_path, result_path]
            for cleanup_file in cleanup_files:
                if os.path.exists(cleanup_file):
                    os.remove(cleanup_file)
            
            return {
                "success": True,
                "message": "RL scheduling completed successfully",
                "runId": runId,
                "result_file_path": final_result_path,
                "total_trains": len(result_df),
                "operational_status_distribution": result_df.get("OperationalStatus", pd.Series()).value_counts().to_dict(),
                "config_used": config.dict()
            }
            
        except Exception as e:
            error_msg = f"RL scheduling failed: {str(e)}"
            print(f"[RL Error] {error_msg}")
            
            # Log the error
            await StorageManager.save_pipeline_log(runId, "rl_error", {
                "message": "RL scheduling failed",
                "error": error_msg,
                "input_file_path": file_path
            })
            
            # Send error webhook
            await RLHandler._send_webhook(runId, None, "error", error_msg)
            raise HTTPException(status_code=500, detail=error_msg)

    @staticmethod
    async def _send_webhook(runId: str, filePath: str = None, status: str = "success", error_message: str = None):
        """Send async webhook call to backend after RL scheduling completes"""
        async with httpx.AsyncClient() as client:
            payload = {
                "runId": runId,
                "status": status,
                "outputFilePath": filePath,
                "error": error_message,
                "metadata": {
                    "processedAt": pd.Timestamp.now().isoformat(),
                    "service": "rl"
                }
            }
            try:
                response = await client.post(
                    RLHandler.WEBHOOK_URL,
                    json=payload,
                    timeout=30  
                )
                response.raise_for_status()
                print(f"[RL] ✅ Webhook sent successfully → {payload}")
                print(f"[RL] Response: {response.status_code} {response.text}")
            except httpx.HTTPStatusError as e:
                print(f"[RL] ❌ Webhook failed with status {e.response.status_code}")
                print(f"[RL] Response body: {e.response.text}")
            except httpx.RequestError as e:
                print(f"[RL] ❌ Webhook request error (connection/timeout): {e}")
            except Exception as e:
                print(f"[RL] ❌ Unexpected error: {e}")

    @staticmethod
    async def schedule_and_return_json(
        file: UploadFile,
        config: RLRequest
    ) -> dict:
        """RL scheduling handler that returns JSON response"""
        try:
            # Process uploaded file
            df = await RLHandler.process_csv_file(file)
            
            # Generate a temporary runId for non-pipeline calls
            import uuid
            runId = f"rl_{uuid.uuid4().hex[:8]}"
            
            # Save CSV temporarily for RL.py processing
            with tempfile.NamedTemporaryFile(mode='w', suffix='.csv', delete=False, newline='') as temp_file:
                temp_path = temp_file.name
                df.to_csv(temp_file, index=False)
            
            # Run RL.py in inference mode
            rl_script_path = Path(__file__).parent / "RL.py"
            
            # Use Windows-compatible temp directory
            temp_dir = tempfile.gettempdir()
            result_path = os.path.join(temp_dir, f"rl_result_{runId}.csv")
            
            # Ensure temp directory exists
            os.makedirs(temp_dir, exist_ok=True)
            
            cmd = [
                sys.executable, str(rl_script_path),
                "--mode", "infer",
                "--csv", temp_path,
                "--out", result_path
            ]
            
            result = subprocess.run(cmd, capture_output=True, text=True, timeout=60)
            
            if result.returncode != 0:
                raise Exception(f"RL processing failed: {result.stderr}")
            
            # Load results
            if not os.path.exists(result_path):
                raise Exception(f"RL result file not found at {result_path}")
                
            result_df = pd.read_csv(result_path)
            
            # Cleanup
            cleanup_files = [temp_path, result_path]
            for cleanup_file in cleanup_files:
                if os.path.exists(cleanup_file):
                    os.remove(cleanup_file)
            
            # Return JSON response
            return {
                "success": True,
                "message": "RL scheduling completed successfully",
                "total_trains": len(result_df),
                "assignments": result_df.to_dict('records')
            }
            
        except Exception as e:
            raise HTTPException(status_code=500, detail=f"RL scheduling failed: {str(e)}")
    
    @staticmethod
    async def get_simple_schedule(
        file: UploadFile,
        config: RLRequest
    ) -> List[dict]:
        """RL scheduling handler that returns simple format"""
        try:
            # Get full JSON response
            full_response = await RLHandler.schedule_and_return_json(file, config)
            
            # Extract simple format
            simple_assignments = []
            for assignment in full_response.get("assignments", []):
                simple_assignments.append({
                    "TrainID": assignment.get("TrainID", assignment.get("Trainname", "")),
                    "OperationalStatus": assignment.get("OperationalStatus", "")
                })
            
            return simple_assignments
            
        except Exception as e:
            raise HTTPException(status_code=500, detail=f"RL scheduling failed: {str(e)}")
    
    @staticmethod
    async def process_csv_file(file: UploadFile) -> pd.DataFrame:
        """Process uploaded CSV file and return DataFrame"""
        try:
            # Validate file type
            if not file.filename.endswith('.csv'):
                raise HTTPException(status_code=400, detail="Only CSV files are supported")
            
            # Read CSV content
            content = await file.read()
            df = pd.read_csv(io.StringIO(content.decode('utf-8')))
            
            if df.empty:
                raise HTTPException(status_code=400, detail="CSV file is empty")
            
            return df
            
        except Exception as e:
            raise HTTPException(status_code=400, detail=f"Error processing CSV file: {str(e)}")
    
    @staticmethod
    def create_csv_response(df: pd.DataFrame, filename: str) -> StreamingResponse:
        """Create CSV streaming response"""
        try:
            # Convert DataFrame to CSV string
            output = io.StringIO()
            df.to_csv(output, index=False)
            output.seek(0)
            
            # Create streaming response
            response = StreamingResponse(
                io.BytesIO(output.getvalue().encode('utf-8')),
                media_type="text/csv",
                headers={"Content-Disposition": f"attachment; filename={filename}"}
            )
            
            return response
            
        except Exception as e:
            raise HTTPException(status_code=500, detail=f"Error creating CSV response: {str(e)}")
    
    @staticmethod
    async def schedule_and_return_csv(
        file: UploadFile,
        config: RLRequest
    ) -> StreamingResponse:
        """RL scheduling handler that returns CSV file download"""
        try:
            # Get full JSON response
            full_response = await RLHandler.schedule_and_return_json(file, config)
            
            # Convert to DataFrame
            assignments_df = pd.DataFrame(full_response.get("assignments", []))
            
            # Return CSV response
            return RLHandler.create_csv_response(assignments_df, "rl_schedule.csv")
            
        except Exception as e:
            raise HTTPException(status_code=500, detail=f"RL CSV scheduling failed: {str(e)}")