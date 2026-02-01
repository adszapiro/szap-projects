#!/bin/bash

# Start the Quant Agent
echo "Starting Quant Agent..."
echo "Mode: Paper Trading"
echo ""

# Load environment variables
if [ -f .env.local ]; then
  export $(cat .env.local | grep -v '^#' | xargs)
fi

# Run the agent
npx tsx src/index.ts
