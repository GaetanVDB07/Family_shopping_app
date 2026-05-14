import '@testing-library/jest-dom'

Object.defineProperty(globalThis, 'localStorage', {
	value: {
		clear() {
			this.store = {};
		},
		getItem(key: string) {
			return this.store[key] ?? null;
		},
		key(index: number) {
			return Object.keys(this.store)[index] ?? null;
		},
		removeItem(key: string) {
			delete this.store[key];
		},
		setItem(key: string, value: string) {
			this.store[key] = value;
		},
		store: {} as Record<string, string>,
		get length() {
			return Object.keys(this.store).length;
		},
	},
	configurable: true,
});

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
