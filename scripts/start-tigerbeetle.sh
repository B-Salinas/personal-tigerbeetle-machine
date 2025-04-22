#!/bin/bash
# Start TigerBeetle server
./scripts/bin/tigerbeetle start --addresses=3000 .data/0_0.tigerbeetle &

# Store the PID
echo $! > .data/tigerbeetle.pid

echo "TigerBeetle server started on port 3000"
