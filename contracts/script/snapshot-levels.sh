#!/bin/bash

# Load environment variables from .env file if it exists
if [ -f .env ]; then
    source .env
fi

# Default to localhost if not set
export ANVIL_URL=${ANVIL_URL:-"http://localhost:8545"}

# Run the snapshot script
forge script script/SnapshotLevels.s.sol:SnapshotLevels \
    --rpc-url $ANVIL_URL \
    --broadcast \
    --skip-simulation 