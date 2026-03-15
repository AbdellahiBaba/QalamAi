#!/bin/bash
set -e
npm run build
echo "Build complete. dist/ size: $(du -sh dist/ 2>/dev/null | cut -f1)"
