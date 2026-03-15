#!/bin/bash
export NAPI_RS_NATIVE_LIBRARY_PATH=./skia.linux-x64-gnu.node
exec node dist/index.cjs
