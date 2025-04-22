#!/bin/bash
if [ -f .data/tigerbeetle.pid ]; then
    pid=$(cat .data/tigerbeetle.pid)
    kill $pid
    rm .data/tigerbeetle.pid
    echo "TigerBeetle server stopped"
else
    echo "TigerBeetle server is not running"
fi
