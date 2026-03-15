import os
import io
import tempfile
import torch
import numpy as np
from contextlib import asynccontextmanager
from fastapi import FastAPI, UploadFile, File, HTTPException, BackgroundTasks
from fastapi.responses import FileResponse
from pydantic import BaseModel
import soundfile as sf

app = FastAPI(title="QalamAI TTS Server (XTTS v2)")

VOICE_DIR = os.path.join(os.path.dirname(os.path.dirname(__file__)), "voice_samples")
VOICE_PATH = os.path.join(VOICE_DIR, "platform_voice.wav")

_tts_model = None
_model_loading = False


def _get_model():
    global _tts_model, _model_loading
    if _tts_model is not None:
        return _tts_model
    if _model_loading:
        raise HTTPException(status_code=503, detail="النموذج قيد التحميل، يرجى المحاولة لاحقاً")
    _model_loading = True
    try:
        from TTS.api import TTS
        print("[TTS] Loading XTTS v2 model (this may take 2-4 minutes on first run)...")
        model = TTS("tts_models/multilingual/multi-dataset/xtts_v2", gpu=False)
        _tts_model = model
        print("[TTS] Model loaded successfully")
        return model
    except Exception as e:
        _model_loading = False
        print(f"[TTS] Failed to load model: {e}")
        raise HTTPException(status_code=503, detail=f"فشل تحميل النموذج: {str(e)}")


class TTSRequest(BaseModel):
    text: str


@app.get("/health")
async def health():
    voice_exists = os.path.isfile(VOICE_PATH)
    model_loaded = _tts_model is not None
    return {"status": "ok", "model_loaded": model_loaded, "voice_configured": voice_exists}


@app.post("/admin/upload-voice")
async def upload_voice(file: UploadFile = File(...)):
    if not file.filename or not file.filename.lower().endswith(".wav"):
        raise HTTPException(status_code=400, detail="يجب أن يكون الملف بصيغة WAV")

    os.makedirs(VOICE_DIR, exist_ok=True)
    content = await file.read()

    if len(content) < 10000:
        raise HTTPException(status_code=400, detail="الملف صغير جداً — يجب ألا يقل عن 6 ثوانٍ من الكلام الواضح")

    with open(VOICE_PATH, "wb") as f:
        f.write(content)

    return {"status": "success", "message": "تم رفع العينة الصوتية بنجاح"}


def _cleanup_temp_file(path: str):
    try:
        os.unlink(path)
    except OSError:
        pass


@app.post("/tts")
async def generate_tts(request: TTSRequest, background_tasks: BackgroundTasks):
    text = request.text.strip()
    if not text:
        raise HTTPException(status_code=400, detail="النص مطلوب")
    if len(text) > 5000:
        raise HTTPException(status_code=400, detail="النص طويل جداً (الحد الأقصى 5000 حرف)")

    if not os.path.isfile(VOICE_PATH):
        raise HTTPException(status_code=400, detail="لم يتم رفع عينة صوتية بعد — يرجى رفع ملف WAV من لوحة الإدارة")

    model = _get_model()

    try:
        wav_data = model.tts(
            text=text,
            speaker_wav=VOICE_PATH,
            language="ar",
        )

        wav_array = np.array(wav_data, dtype=np.float32)
        tmp = tempfile.NamedTemporaryFile(suffix=".wav", delete=False)
        sf.write(tmp.name, wav_array, samplerate=22050, format="WAV")

        background_tasks.add_task(_cleanup_temp_file, tmp.name)

        return FileResponse(
            path=tmp.name,
            media_type="audio/wav",
            filename="tts_output.wav",
        )
    except Exception as e:
        print(f"[TTS] Generation error: {e}")
        raise HTTPException(status_code=500, detail=f"فشل في توليد الصوت: {str(e)}")
