export type ParticleOptions = {
	quantity: number;
	speed: number;
	staticity: number;
	ease: number;
};

type Circle = {
	x: number;
	y: number;
	translateX: number;
	translateY: number;
	size: number;
	targetAlpha: number;
	alpha: number;
	// Drift per frame at speed 1; scaled by the speed option in #update
	dx: number;
	dy: number;
	magnetism: number;
};

const DEFAULT_OPTIONS: Readonly<ParticleOptions> = {
	quantity: 30,
	speed: 1,
	staticity: 50,
	ease: 50,
};

// Distance from the canvas edge (px) over which particles fade out
const EDGE_FADE_DISTANCE = 20;
// Alpha added per frame while a particle fades in
const FADE_IN_STEP = 0.02;
// Duration of one frame at 60fps; movement is scaled against this so speed is the same on any refresh rate
const FRAME_MS = 1000 / 60;
// Cap on frames to catch up after a long pause (e.g. returning to a background tab)
const MAX_FRAME_DELTA = 3;

const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)");

// Particle animation
export class ParticleAnimation {
	readonly #canvas: HTMLCanvasElement;
	readonly #container: HTMLElement;
	readonly #ctx: CanvasRenderingContext2D;
	readonly #options: Readonly<ParticleOptions>;
	readonly #resizeObserver: ResizeObserver;
	#circles: Circle[] = [];
	#size = { w: 0, h: 0 };
	#mouse = { x: 0, y: 0 };
	#frame = 0;
	#lastTime = 0;

	constructor(
		canvas: HTMLCanvasElement,
		options: Partial<ParticleOptions> = {},
	) {
		const ctx = canvas.getContext("2d");
		if (!ctx) throw new Error("Canvas 2D context is not supported");
		if (!canvas.parentElement)
			throw new Error("Canvas must have a parent element");

		this.#canvas = canvas;
		this.#container = canvas.parentElement;
		this.#ctx = ctx;
		this.#options = {
			quantity: Math.max(
				0,
				Math.round(options.quantity ?? DEFAULT_OPTIONS.quantity),
			),
			speed: Math.max(0, options.speed ?? DEFAULT_OPTIONS.speed),
			// Guard against values that would divide by zero or overshoot the target
			staticity: Math.max(1, options.staticity ?? DEFAULT_OPTIONS.staticity),
			ease: Math.max(1, options.ease ?? DEFAULT_OPTIONS.ease),
		};

		// Fires once on observe, which does the initial setup
		this.#resizeObserver = new ResizeObserver(() => this.#resize());
		this.#resizeObserver.observe(this.#container);

		// Listen on window: the container has pointer-events: none
		if (!reducedMotion.matches) {
			window.addEventListener("pointermove", this.#onPointerMove, {
				passive: true,
			});
		}
	}

	destroy() {
		cancelAnimationFrame(this.#frame);
		this.#frame = 0;
		this.#resizeObserver.disconnect();
		window.removeEventListener("pointermove", this.#onPointerMove);
	}

	// Store the pointer position relative to the canvas center, only while it is over the canvas
	#onPointerMove = (event: PointerEvent) => {
		const rect = this.#canvas.getBoundingClientRect();
		const halfW = this.#size.w / 2;
		const halfH = this.#size.h / 2;
		const x = event.clientX - rect.left - halfW;
		const y = event.clientY - rect.top - halfH;
		if (Math.abs(x) < halfW && Math.abs(y) < halfH) {
			this.#mouse = { x, y };
		}
	};

	#resize() {
		const dpr = window.devicePixelRatio || 1;
		this.#size = {
			w: this.#container.offsetWidth,
			h: this.#container.offsetHeight,
		};
		this.#canvas.width = this.#size.w * dpr;
		this.#canvas.height = this.#size.h * dpr;
		this.#canvas.style.width = `${this.#size.w}px`;
		this.#canvas.style.height = `${this.#size.h}px`;
		this.#ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

		this.#circles = Array.from({ length: this.#options.quantity }, () =>
			this.#createCircle(),
		);

		if (reducedMotion.matches) {
			// Show the particles without animating them
			for (const circle of this.#circles) circle.alpha = circle.targetAlpha;
			this.#draw();
		} else if (!this.#frame) {
			this.#frame = requestAnimationFrame(this.#animate);
		}
	}

	#createCircle(): Circle {
		return {
			x: Math.floor(Math.random() * this.#size.w),
			y: Math.floor(Math.random() * this.#size.h),
			translateX: 0,
			translateY: 0,
			size: Math.floor(Math.random() * 2) + 1,
			alpha: 0,
			targetAlpha: Math.round((Math.random() * 0.6 + 0.1) * 10) / 10,
			dx: Math.random() - 0.5,
			dy: Math.random() - 0.5,
			magnetism: 0.1 + Math.random() * 4,
		};
	}

	#animate = (time: number) => {
		const delta = this.#lastTime
			? Math.min((time - this.#lastTime) / FRAME_MS, MAX_FRAME_DELTA)
			: 1;
		this.#lastTime = time;

		this.#update(delta);
		this.#draw();
		this.#frame = requestAnimationFrame(this.#animate);
	};

	#update(delta: number) {
		// Fraction of the remaining distance to the mouse target covered this frame (1/ease at 60fps)
		const easeStep = 1 - (1 - 1 / this.#options.ease) ** delta;

		for (let i = 0; i < this.#circles.length; i++) {
			const circle = this.#circles[i];
			circle.x += circle.dx * this.#options.speed * delta;
			circle.y += circle.dy * this.#options.speed * delta;

			if (this.#isOutside(circle)) {
				this.#circles[i] = this.#createCircle();
				continue;
			}

			// Ease towards the mouse; particles with more magnetism move further
			const pull = circle.magnetism / this.#options.staticity;
			circle.translateX +=
				(this.#mouse.x * pull - circle.translateX) * easeStep;
			circle.translateY +=
				(this.#mouse.y * pull - circle.translateY) * easeStep;

			// Fade out near the edges, fade in everywhere else
			const edgeFade = Math.max(
				0,
				this.#distanceToEdge(circle) / EDGE_FADE_DISTANCE,
			);
			if (edgeFade > 1) {
				circle.alpha = Math.min(
					circle.alpha + FADE_IN_STEP * delta,
					circle.targetAlpha,
				);
			} else {
				circle.alpha = circle.targetAlpha * edgeFade;
			}
		}
	}

	#draw() {
		this.#ctx.clearRect(0, 0, this.#size.w, this.#size.h);
		for (const circle of this.#circles) {
			this.#ctx.beginPath();
			this.#ctx.arc(
				circle.x + circle.translateX,
				circle.y + circle.translateY,
				circle.size,
				0,
				2 * Math.PI,
			);
			this.#ctx.fillStyle = `rgba(255, 255, 255, ${circle.alpha})`;
			this.#ctx.fill();
		}
	}

	#distanceToEdge(circle: Circle) {
		const x = circle.x + circle.translateX;
		const y = circle.y + circle.translateY;
		return Math.min(x, this.#size.w - x, y, this.#size.h - y) - circle.size;
	}

	#isOutside(circle: Circle) {
		return (
			circle.x < -circle.size ||
			circle.x > this.#size.w + circle.size ||
			circle.y < -circle.size ||
			circle.y > this.#size.h + circle.size
		);
	}
}
