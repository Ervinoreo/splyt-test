import express, { Request, Response } from "express";

const app = express();
const PORT = 8006;

app.use(express.json());

interface DriverLocation {
  driver_id: string;
  latitude: number;
  longitude: number;
  timestamp: string;
}

const driverLocations = new Map<string, DriverLocation[]>();

interface Subscriber {
  res: Response;
  lastSentTimestamp: string;
}
const subscribers = new Map<string, Set<Subscriber>>();

app.get("/stream/:driver_id", (req: Request, res: Response) => {
  const { driver_id } = req.params;
  const since = req.query.since as string | undefined;

  console.log(
    `New subscriber for driver: ${driver_id}, since: ${since || "latest"}`
  );

  res.setHeader("Content-Type", "text/event-stream");
  res.setHeader("Cache-Control", "no-cache");
  res.setHeader("Connection", "keep-alive");
  res.setHeader("Access-Control-Allow-Origin", "*");

  const history = driverLocations.get(driver_id) || [];
  let lastSentTimestamp: string;

  if (since) {
    // Send updates from `since`
    const sinceDate = new Date(since);
    const filteredHistory = history.filter(
      (loc) => new Date(loc.timestamp) > sinceDate
    );

    filteredHistory.forEach((loc) => {
      res.write(`data: ${JSON.stringify(loc)}\n\n`);
    });

    lastSentTimestamp = filteredHistory.length
      ? filteredHistory[filteredHistory.length - 1].timestamp
      : since;
  } else {
    // No `since`
    if (history.length) {
      const latest = history[history.length - 1];
      res.write(`data: ${JSON.stringify(latest)}\n\n`);
      lastSentTimestamp = latest.timestamp;
    } else {
      lastSentTimestamp = new Date(0).toISOString();
    }
  }

  const subscriber: Subscriber = { res, lastSentTimestamp };
  if (!subscribers.has(driver_id)) subscribers.set(driver_id, new Set());
  subscribers.get(driver_id)!.add(subscriber);

  req.on("close", () => {
    console.log(`Subscriber disconnected from driver: ${driver_id}`);
    subscribers.get(driver_id)?.delete(subscriber);
    if (subscribers.get(driver_id)?.size === 0) subscribers.delete(driver_id);
  });
});

// Endpoint to receive driver location updates
app.post("/event", (req: Request, res: Response) => {
  const { data, event } = req.body;

  console.log(
    "Received driver location update:",
    JSON.stringify(req.body, null, 2)
  );

  const location: DriverLocation = {
    driver_id: data.driver_id,
    latitude: data.latitude,
    longitude: data.longitude,
    timestamp: data.timestamp,
  };

  if (!driverLocations.has(data.driver_id)) {
    driverLocations.set(data.driver_id, []);
  }
  driverLocations.get(data.driver_id)!.push(location);

  const driverSubs = subscribers.get(data.driver_id);
  if (driverSubs) {
    driverSubs.forEach((sub) => {
      if (new Date(location.timestamp) > new Date(sub.lastSentTimestamp)) {
        sub.res.write(`data: ${JSON.stringify(location)}\n\n`);
        sub.lastSentTimestamp = location.timestamp;
      } else {
        console.log(`Skipped (already sent this timestamp)`);
      }
    });
  }

  res.status(200).json({
    success: true,
    message: "Location data received",
    timestamp: new Date().toISOString(),
  });
});

app.listen(PORT, () => {
  console.log(`🚀 Server is running on http://localhost:${PORT}`);
});
