import '@testing-library/jest-dom'

const rafTimers = new Map<number, ReturnType<typeof setTimeout>>();
let rafId = 0;

if (!globalThis.requestAnimationFrame) {
	globalThis.requestAnimationFrame = (callback: FrameRequestCallback): number => {
		const id = ++rafId;
		const timer = setTimeout(() => {
			rafTimers.delete(id);
			callback(performance.now());
		}, 0);
		rafTimers.set(id, timer);
		return id;
	};
}

if (!globalThis.cancelAnimationFrame) {
	globalThis.cancelAnimationFrame = (handle: number): void => {
		const timer = rafTimers.get(handle);
		if (timer) {
			clearTimeout(timer);
			rafTimers.delete(handle);
		}
	};
}
