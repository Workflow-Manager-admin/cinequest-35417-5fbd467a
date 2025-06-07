#!/bin/bash
cd /home/kavia/workspace/code-generation/cinequest-35417-5fbd467a/cinequest_main
npm run build
EXIT_CODE=$?
if [ $EXIT_CODE -ne 0 ]; then
   exit 1
fi

