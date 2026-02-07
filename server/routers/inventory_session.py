from pydantic import ValidationError
from fastapi import APIRouter, Depends, HTTPException, status, Header
from database.models.user import User
from services.inventory_session_service import InventorySessionService
import pandas as pd
from dependencies import get_current_user
from fastapi import File, UploadFile, Form
from schemas.detection_params import DetectionParamsSchema
from pydantic import Json
import io

router = APIRouter(
    prefix="/inventory",
    tags=["inventory"]
)

mandatory_columns = {"title", "author", "isbn"}

@router.post("/session")
async def register(csv_file: UploadFile = File(...),
             detection_params: str = Form(...),
             current_user: User = Depends(get_current_user),
             inventory_session_service: InventorySessionService = Depends(InventorySessionService)):
    """Create a new inventory session"""
    # TODO: étudier aspect sécurité ?
    # CSV file is uploaded as binary file
    # https://stackoverflow.com/questions/70617121/how-to-upload-a-csv-file-in-fastapi-and-convert-it-into-json
    print("starting register code")

    # Convert params string into Pydantic schema
    try:
        detection_params = DetectionParamsSchema.model_validate_json(detection_params)
        
    except ValidationError as e:
        raise HTTPException(status_code=422, detail=f"Invalid JSON params: {e}")

    # Convert CSV to pandas dataframe
    try:
        contents = await csv_file.read()
        df = pd.read_csv(io.BytesIO(contents), sep=None, engine='python')
    except Exception as e:
        raise HTTPException(status_code=400, detail="Bad CSV")
    finally:
        await csv_file.close()
    
    if len(df) == 0 or not mandatory_columns.issubset(set(df.columns.values)):
        raise HTTPException(status_code=400, detail="CSV is empty or doesn't have mandatory columns")

    inventory_session_service.create_session(
        session_id=current_user.id,
        df=df,
        detection_params=detection_params
    )
    
    return {
        "status": "success", 
        "message": "Inventory received", 
        "count": len(df)
    }

@router.get("/session")
def register(current_user: User = Depends(get_current_user),
             inventory_session_service: InventorySessionService = Depends(InventorySessionService)):
    """Get an existing inventory session"""

    session = inventory_session_service.get_session_data(current_user.id)
    
    if not session:
        raise HTTPException(status_code=404, detail="No session found")
    
    return {
        "status": "success", 
        "message": "Inventory received", 
        "session_id": session.session_id
    }