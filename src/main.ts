import {
	ParticleAnimation,
	type ParticleOptions,
} from "./components/particles";
import "./style.css";

// Init ParticleAnimation
document
	.querySelectorAll<HTMLCanvasElement>(".particle-animation")
	.forEach(
		(canvas) => new ParticleAnimation(canvas, readDatasetOptions(canvas)),
	);

function readDatasetOptions(el: HTMLElement): Partial<ParticleOptions> {
	return {
		quantity: toNumber(el.dataset.particleQuantity),
		speed: toNumber(el.dataset.particleSpeed),
		staticity: toNumber(el.dataset.particleStaticity),
		ease: toNumber(el.dataset.particleEase),
	};
}

function toNumber(value: string | undefined): number | undefined {
	if (value === undefined || value.trim() === "") return undefined;
	const n = Number(value);
	return Number.isFinite(n) ? n : undefined;
}
