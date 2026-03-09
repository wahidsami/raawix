import { Router, Request, Response } from 'express';
import jwt from 'jsonwebtoken';
import { scanEventEmitter } from '../events/scan-events.js';
import { config } from '../config.js';

const router: Router = Router();

/**
 * GET /api/scans/:scanId/events
 * Server-Sent Events endpoint for real-time scan progress
 * Note: EventSource doesn't support custom headers, so token is passed via query param
 */
router.get('/scans/:scanId/events', async (req: Request, res: Response) => {
  const { scanId } = req.params;

  // Get token from query param (EventSource limitation)
  const token = req.query.token as string | undefined;
  if (!token) {
    return res.status(401).json({ error: 'Token required' });
  }

  // Verify token (use same logic as requireAuth middleware)
  try {
    const decoded = jwt.verify(token, config.jwtSecret);
    if (!decoded) {
      return res.status(401).json({ error: 'Invalid token' });
    }
  } catch (error: any) {
    console.error('SSE token verification failed:', error);
    if (error?.message?.includes('expired')) {
      return res.status(401).json({ error: 'Token expired' });
    }
    return res.status(401).json({ error: 'Invalid token' });
  }

  // Verify scan exists before opening a long-lived stream
  try {
    const prisma = await import('../db/client.js').then(m => m.getPrismaClient());
    if (!prisma) {
      return res.status(503).json({ error: 'Database not available' });
    }

    // Try to find scan by scanId (not id)
    const scan = await prisma.scan.findUnique({
      where: { scanId },
      select: { id: true, status: true },
    });

    // If scan doesn't exist, fail fast
    if (!scan) {
      return res.status(404).json({ error: 'Scan not found' });
    }
  } catch (error) {
    console.error('[SSE] Error verifying scan:', error);
    return res.status(500).json({ error: 'Failed to validate scan stream request' });
  }

  // Set SSE headers
  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('Connection', 'keep-alive');
  res.setHeader('X-Accel-Buffering', 'no'); // Disable nginx buffering

  // Send initial connection message
  res.write(`data: ${JSON.stringify({ type: 'connected', scanId, timestamp: new Date().toISOString() })}\n\n`);

  // Send stored events (for late subscribers)
  const storedEvents = scanEventEmitter.getStoredEvents(scanId);
  for (const event of storedEvents) {
    res.write(`data: ${JSON.stringify(event)}\n\n`);
  }

  // Listen for new events
  const eventHandler = (event: any) => {
    try {
      res.write(`data: ${JSON.stringify(event)}\n\n`);
    } catch (error) {
      // Client disconnected, stop sending
      scanEventEmitter.removeListener(`scan-${scanId}`, eventHandler);
      res.end();
    }
  };

  scanEventEmitter.on(`scan-${scanId}`, eventHandler);

  // Clean up on client disconnect
  req.on('close', () => {
    scanEventEmitter.removeListener(`scan-${scanId}`, eventHandler);
    res.end();
  });

  // Keep connection alive with heartbeat
  const heartbeatInterval = setInterval(() => {
    try {
      res.write(`: heartbeat\n\n`);
    } catch {
      clearInterval(heartbeatInterval);
      scanEventEmitter.removeListener(`scan-${scanId}`, eventHandler);
      res.end();
    }
  }, 30000); // Every 30 seconds

  // Clean up heartbeat on disconnect
  req.on('close', () => {
    clearInterval(heartbeatInterval);
  });
});

export default router;

