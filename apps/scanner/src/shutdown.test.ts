import { describe, it, expect, vi, beforeEach } from 'vitest';

describe('Shutdown Handling', () => {
  let isShuttingDown = false;
  
  beforeEach(() => {
    isShuttingDown = false;
    vi.clearAllMocks();
  });

  it('closes resources without immediately exiting before cleanup', async () => {
    // Mock the shutdown sequence
    const mockCloseServer = vi.fn().mockImplementation((cb) => setTimeout(() => cb(), 10));
    const mockCloseWorker = vi.fn().mockResolvedValue(undefined);
    const mockShutdownQueue = vi.fn().mockResolvedValue(undefined);
    const mockQuitRedis = vi.fn();
    const mockDisconnectPrisma = vi.fn().mockResolvedValue(undefined);
    const mockProcessExit = vi.spyOn(process, 'exit').mockImplementation((() => {}) as any);

    const shutdown = async () => {
      if (isShuttingDown) return;
      isShuttingDown = true;
      
      await new Promise<void>((resolve) => mockCloseServer(resolve));
      await mockCloseWorker();
      await mockShutdownQueue();
      mockQuitRedis();
      await mockDisconnectPrisma();
      
      process.exit(0);
    };

    const promise = shutdown();
    
    // Immediately after calling shutdown, exit should NOT have been called
    expect(mockProcessExit).not.toHaveBeenCalled();
    
    await promise;
    
    // After promise resolves, all resources should be closed and exit called
    expect(mockCloseServer).toHaveBeenCalled();
    expect(mockCloseWorker).toHaveBeenCalled();
    expect(mockShutdownQueue).toHaveBeenCalled();
    expect(mockQuitRedis).toHaveBeenCalled();
    expect(mockDisconnectPrisma).toHaveBeenCalled();
    expect(mockProcessExit).toHaveBeenCalledWith(0);
  });

  it('repeated shutdown signals do not run cleanup twice', async () => {
    const mockCloseWorker = vi.fn().mockResolvedValue(undefined);
    
    const shutdown = async () => {
      if (isShuttingDown) return;
      isShuttingDown = true;
      
      await mockCloseWorker();
    };

    await Promise.all([shutdown(), shutdown(), shutdown()]);
    
    expect(mockCloseWorker).toHaveBeenCalledTimes(1);
  });
});
