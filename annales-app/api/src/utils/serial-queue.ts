/**
 * Executes async tasks one at a time in FIFO order.
 * Used to prevent concurrent CPU/memory-intensive operations (e.g. Sharp image processing)
 * from spiking resource usage under load.
 */
export class SerialQueue {
  private tail: Promise<unknown> = Promise.resolve();

  run<T>(task: () => Promise<T>): Promise<T> {
    const result = this.tail.then(() => task());
    // Keep the chain alive if a task rejects, otherwise all subsequent tasks would reject too
    this.tail = result.catch(() => undefined);
    return result;
  }
}
