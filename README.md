# Splyt Driver Location Service

Real-time driver location streaming service using Server-Sent Events (SSE).

## Subscribe to Driver Updates

### Get Latest Updates

```bash
curl -N http://localhost:8006/stream/driver_001
```

### Get Updates Since Specific Time

```bash
curl -N "http://localhost:8006/stream/driver_001?since=2025-09-26T04:00:00Z"
```

### Subscribe to Multiple Drivers

```bash
# Terminal 1
curl -N http://localhost:8006/stream/driver_001

# Terminal 2
curl -N http://localhost:8006/stream/driver_002
```
