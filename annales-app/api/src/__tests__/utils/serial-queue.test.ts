import { SerialQueue } from '../../utils/serial-queue.js';

const delay = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

describe('SerialQueue', () => {
  it('executes tasks sequentially, not in parallel', async () => {
    const queue = new SerialQueue();
    const log: string[] = [];

    const task = (id: string, ms: number) => async () => {
      log.push(`start-${id}`);
      await delay(ms);
      log.push(`end-${id}`);
      return id;
    };

    const results = await Promise.all([
      queue.run(task('a', 20)),
      queue.run(task('b', 10)),
      queue.run(task('c', 5)),
    ]);

    expect(results).toEqual(['a', 'b', 'c']);
    expect(log).toEqual(['start-a', 'end-a', 'start-b', 'end-b', 'start-c', 'end-c']);
  });

  it('continues processing after a task rejects', async () => {
    const queue = new SerialQueue();

    const failing = queue.run(async () => {
      throw new Error('boom');
    });
    await expect(failing).rejects.toThrow('boom');

    const succeeding = queue.run(async () => 42);
    await expect(succeeding).resolves.toBe(42);
  });

  it('preserves FIFO order even when tasks have different durations', async () => {
    const queue = new SerialQueue();
    const completionOrder: string[] = [];

    await Promise.all([
      queue.run(async () => {
        await delay(30);
        completionOrder.push('slow');
      }),
      queue.run(async () => {
        await delay(5);
        completionOrder.push('fast');
      }),
    ]);

    expect(completionOrder).toEqual(['slow', 'fast']);
  });
});
