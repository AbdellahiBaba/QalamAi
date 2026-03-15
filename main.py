import uvicorn

if __name__ == "__main__":
    uvicorn.run("tts_server.server:app", host="0.0.0.0", port=8000, log_level="info")
