#!/bin/bash
set -e
npm install
npm run db:push

python3 scripts/patch_replit_ignore.py
