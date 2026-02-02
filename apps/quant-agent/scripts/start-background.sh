#!/bin/bash
# =============================================================================
# Start Quant Agent in Background
# =============================================================================
#
# This script starts the quant agent as a low-priority background process
# that won't significantly impact laptop performance.
#
# Usage:
#   ./scripts/start-background.sh        # Start the agent
#   ./scripts/start-background.sh stop   # Stop the agent
#   ./scripts/start-background.sh status # Check if running
#
# =============================================================================

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
AGENT_DIR="$(dirname "$SCRIPT_DIR")"
PID_FILE="$AGENT_DIR/.agent.pid"
LOG_FILE="$AGENT_DIR/agent.log"

cd "$AGENT_DIR"

start_agent() {
    if [ -f "$PID_FILE" ]; then
        PID=$(cat "$PID_FILE")
        if ps -p "$PID" > /dev/null 2>&1; then
            echo "⚠️  Agent is already running (PID: $PID)"
            exit 1
        fi
    fi

    echo "🚀 Starting Quant Agent in background..."
    echo "   Log file: $LOG_FILE"
    
    # Start with low priority (nice value of 10)
    # Redirect output to log file
    nohup nice -n 10 npm run start > "$LOG_FILE" 2>&1 &
    
    PID=$!
    echo "$PID" > "$PID_FILE"
    
    sleep 2
    
    if ps -p "$PID" > /dev/null 2>&1; then
        echo "✅ Agent started successfully (PID: $PID)"
        echo "   View logs: tail -f $LOG_FILE"
    else
        echo "❌ Agent failed to start. Check logs:"
        tail -20 "$LOG_FILE"
        rm -f "$PID_FILE"
        exit 1
    fi
}

stop_agent() {
    if [ ! -f "$PID_FILE" ]; then
        echo "⚠️  No PID file found. Agent may not be running."
        exit 0
    fi
    
    PID=$(cat "$PID_FILE")
    
    if ps -p "$PID" > /dev/null 2>&1; then
        echo "🛑 Stopping agent (PID: $PID)..."
        kill "$PID"
        sleep 2
        
        if ps -p "$PID" > /dev/null 2>&1; then
            echo "   Force killing..."
            kill -9 "$PID"
        fi
        
        echo "✅ Agent stopped"
    else
        echo "⚠️  Agent was not running"
    fi
    
    rm -f "$PID_FILE"
}

status_agent() {
    if [ ! -f "$PID_FILE" ]; then
        echo "❌ Agent is not running (no PID file)"
        exit 1
    fi
    
    PID=$(cat "$PID_FILE")
    
    if ps -p "$PID" > /dev/null 2>&1; then
        echo "✅ Agent is running (PID: $PID)"
        echo ""
        echo "📊 Recent activity:"
        tail -10 "$LOG_FILE" 2>/dev/null || echo "   No logs yet"
    else
        echo "❌ Agent is not running (stale PID file)"
        rm -f "$PID_FILE"
        exit 1
    fi
}

case "${1:-start}" in
    start)
        start_agent
        ;;
    stop)
        stop_agent
        ;;
    status)
        status_agent
        ;;
    restart)
        stop_agent
        sleep 1
        start_agent
        ;;
    *)
        echo "Usage: $0 {start|stop|status|restart}"
        exit 1
        ;;
esac
