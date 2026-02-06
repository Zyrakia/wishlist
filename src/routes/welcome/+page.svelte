<script lang="ts">
	import {
		Gift,
		Heart,
		Users,
		Sparkles,
		ShieldCheck,
		ListPlus,
		PartyPopper,
		Share2,
		ArrowRight,
		ArrowDown,
		Link,
		LogIn,
		Star,
		Headphones,
	} from '@lucide/svelte';
</script>

<svelte:head>
	<link
		href="https://fonts.googleapis.com/css2?family=Lilita+One&family=Nunito:ital,wght@0,300..800;1,300..800&display=swap"
		rel="stylesheet"
	/>
</svelte:head>

<div
	class="journey min-h-screen overflow-hidden bg-(--j-page-bg) font-[Nunito,sans-serif] transition-opacity duration-600 dark:bg-(--j-page-bg-dark)"
>
	<nav class="flex items-center justify-between bg-(--j-bg-1) px-6 py-4 dark:bg-(--j-bg-1-dark)">
		<span class="font-[Lilita_One,sans-serif] text-xl text-(--j-orange) dark:text-[#f0a888]">
			Wishii
		</span>
		<div class="flex items-center gap-2">
			<a
				href="/login"
				class="inline-flex items-center gap-1.5 rounded-lg px-4 py-2 text-sm font-semibold text-text-muted no-underline transition-colors hover:text-text"
			>
				<LogIn size={15} />
				Log in
			</a>
			<a
				href="/register"
				class="inline-flex items-center rounded-lg bg-(--j-orange) px-4 py-2 text-sm font-bold text-white no-underline shadow-[0_2px_8px_rgba(232,128,92,0.25)] transition-all hover:-translate-y-px hover:shadow-[0_4px_14px_rgba(232,128,92,0.35)] dark:bg-[#f0a888] dark:text-[#1a1310]"
			>
				Sign up
			</a>
		</div>
	</nav>

	<section
		class="flex flex-col items-center bg-(--j-bg-1) px-6 py-8 text-center dark:bg-(--j-bg-1-dark)"
	>
		<div class="mb-6 flex items-center gap-3">
			<div
				class="anim-bob flex size-11 items-center justify-center rounded-xl bg-(--j-orange) text-white"
				style="animation-delay:0s"
			>
				<Gift size={18} />
			</div>
			<div
				class="anim-bob flex size-11 items-center justify-center rounded-xl bg-(--j-pink) text-white"
				style="animation-delay:0.4s"
			>
				<Heart size={18} />
			</div>
			<div
				class="anim-bob flex size-11 items-center justify-center rounded-xl bg-(--j-gold) text-white"
				style="animation-delay:0.8s"
			>
				<Sparkles size={18} />
			</div>
			<div
				class="anim-bob flex size-11 items-center justify-center rounded-xl bg-(--j-green) text-white"
				style="animation-delay:1.2s"
			>
				<Users size={18} />
			</div>
		</div>

		<h1
			class="mb-4 font-[Lilita_One,sans-serif] text-[clamp(2.4rem,7vw,3.6rem)] leading-tight text-text"
		>
			Gift giving,
			<br />
			but enjoyable.
		</h1>

		<p class="mb-8 max-w-[520px] text-lg leading-relaxed text-text-muted">
			Stress, especially during holidays, is rising <a
				target="blank"
				href="https://www.psychiatry.org/news-room/news-releases/americans-more-anxious-about-the-holidays"
				class="font-bold underline"
			>
				sharply
			</a>
			😔. I know you feel it. Wishii aims to <b>remove</b> the <b>stress</b> and
			<b>guesswork</b>, so we can <b>reclaim</b> some lost <b>enjoyment</b>.
		</p>

		<div class="mb-10">
			<a
				href="/register"
				class="btn-primary inline-flex items-center gap-2 rounded-xl bg-(--j-orange) px-8 py-3.5 font-[Lilita_One,sans-serif] text-lg text-white no-underline shadow-[0_4px_18px_rgba(232,128,92,0.3)] transition-all hover:-translate-y-0.5 hover:scale-[1.02] hover:shadow-[0_6px_24px_rgba(232,128,92,0.4)] dark:bg-[#f0a888] dark:text-[#1a1310]"
			>
				Create your wishlist
				<ArrowRight size={18} />
			</a>
		</div>

		<div
			class="anim-bounce flex flex-col items-center gap-1 text-sm text-text-muted opacity-60"
		>
			<ArrowDown size={18} />
			<span>See how it works</span>
		</div>
	</section>

	<div class="-mt-px leading-0">
		<svg
			viewBox="0 0 1200 100"
			preserveAspectRatio="none"
			class="block h-[60px] w-full sm:h-20"
		>
			<path
				d="M0,50 C150,100 350,0 600,50 C850,100 1050,0 1200,50 L1200,100 L0,100 Z"
				class="fill-(--j-bg-2) dark:fill-(--j-bg-2-dark)"
			/>
		</svg>
	</div>

	<section class="bg-(--j-bg-2) px-6 py-10 pb-12 dark:bg-(--j-bg-2-dark)">
		<div
			class="relative mx-auto flex max-w-3xl flex-col items-center gap-8 min-[700px]:flex-row min-[700px]:gap-12"
		>
			<div class="flex size-[200px] shrink-0 items-center justify-center">
				<div class="flex flex-col items-center gap-2">
					<div
						class="flex items-center gap-1.5 overflow-hidden rounded-lg border border-border bg-surface p-2 text-xs whitespace-nowrap text-text-muted shadow-[0_2px_8px_rgba(0,0,0,0.05)] dark:shadow-[0_2px_8px_rgba(0,0,0,0.2)]"
					>
						<Link size={14} />

						<span>amazon.com/cool-headphones...</span>
					</div>

					<div class="anim-bounce text-(--j-green)">
						<ArrowDown size={18} />
					</div>

					<div
						class="relative flex flex-col items-center gap-2 rounded-[10px] border border-border bg-surface p-2.5 shadow-[0_3px_12px_rgba(0,0,0,0.06)] dark:shadow-[0_3px_12px_rgba(0,0,0,0.25)]"
					>
						<div
							class="grid w-full place-items-center rounded-md bg-linear-to-br from-(--j-orange) to-(--j-pink) py-2 opacity-70"
						>
							<Headphones class="anim-bounce rotate-10" />
						</div>

						<div class="flex animate-pulse flex-col gap-1.5">
							<div class="h-1.5 w-20 rounded-full bg-text-muted"></div>
							<div class="h-1.5 w-[50px] rounded-full bg-text-muted"></div>
						</div>

						<Sparkles
							size={14}
							class="anim-twinkle absolute -top-1.5 -right-1.5 text-(--j-gold)"
						/>
					</div>
				</div>
			</div>

			<div class="flex-1">
				<h2
					class="mb-3 font-[Lilita_One,sans-serif] text-[clamp(1.5rem,4vw,2rem)] text-text"
				>
					Create your wishlist
				</h2>

				<p class="mb-4 leading-relaxed text-text-muted">
					Paste a product link and our AI fills in the details automatically — name,
					price, image, everything. You can change whatever you want, or even do it all
					manually, up to you.
				</p>

				<div class="flex flex-wrap gap-3">
					<span
						class="inline-flex items-center gap-1.5 rounded-full bg-black/5 px-3.5 py-1.5 text-sm font-semibold text-text dark:bg-white/6"
					>
						<ListPlus size={14} /> Unlimited lists
					</span>

					<span
						class="inline-flex items-center gap-1.5 rounded-full bg-black/5 px-3.5 py-1.5 text-sm font-semibold text-text dark:bg-white/6"
					>
						<Sparkles size={14} /> AI-powered cards
					</span>
				</div>
			</div>
		</div>
	</section>

	<div class="-mt-px leading-0">
		<svg
			viewBox="0 0 1200 100"
			preserveAspectRatio="none"
			class="block h-[60px] w-full sm:h-20"
		>
			<path
				d="M0,50 C150,0 350,100 600,50 C850,0 1050,100 1200,50 L1200,100 L0,100 Z"
				class="fill-(--j-bg-3) dark:fill-(--j-bg-3-dark)"
			/>
		</svg>
	</div>

	<section class="bg-(--j-bg-3) px-6 py-10 pb-12 dark:bg-(--j-bg-3-dark)">
		<div
			class="relative mx-auto flex max-w-3xl flex-col items-center gap-8 min-[700px]:flex-row-reverse min-[700px]:gap-12"
		>
			<div class="relative flex size-[200px] shrink-0 items-center justify-center">
				<div class="relative size-40">
					<div class="absolute inset-0">
						<div
							class="absolute top-0 left-1/2 flex size-[42px] -translate-x-1/2 items-center justify-center rounded-full bg-(--j-green) text-white"
						>
							<Star size={18} />
						</div>

						<div
							class="absolute bottom-[15px] left-2.5 flex size-[42px] items-center justify-center rounded-full bg-(--j-pink) text-white"
						>
							<Heart size={14} />
						</div>

						<div
							class="absolute right-2.5 bottom-[15px] flex size-[42px] items-center justify-center rounded-full bg-(--j-purple) text-white"
						>
							<Users size={14} />
						</div>
					</div>

					<div
						class="absolute top-1/2 left-1/2 flex size-12 -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-full bg-(--j-orange) text-white shadow-[0_3px_14px_rgba(232,128,92,0.3)]"
					>
						<Gift size={22} />
					</div>
				</div>
			</div>

			<div class="flex-1">
				<h2
					class="mb-3 font-[Lilita_One,sans-serif] text-[clamp(1.5rem,4vw,2rem)] text-text"
				>
					Share with your people
				</h2>

				<p class="mb-4 leading-relaxed text-text-muted">
					Create groups for family, friends, coworkers - anyone you exchange gifts with.
					Everyone sees each other's lists. Stop keeping track of everything in 7
					different group chats...
				</p>

				<div class="flex flex-wrap gap-3">
					<span
						class="inline-flex items-center gap-1.5 rounded-full bg-black/5 px-3.5 py-1.5 text-sm font-semibold text-text dark:bg-white/6"
					>
						<Users size={14} /> Family groups
					</span>

					<span
						class="inline-flex items-center gap-1.5 rounded-full bg-black/5 px-3.5 py-1.5 text-sm font-semibold text-text dark:bg-white/6"
					>
						<Share2 size={14} /> One-link sharing
					</span>
				</div>
			</div>
		</div>
	</section>

	<div class="-mt-px leading-0">
		<svg
			viewBox="0 0 1200 100"
			preserveAspectRatio="none"
			class="block h-[60px] w-full sm:h-20"
		>
			<path
				d="M0,50 C150,100 350,0 600,50 C850,100 1050,0 1200,50 L1200,100 L0,100 Z"
				class="fill-(--j-bg-1) dark:fill-(--j-bg-1-dark)"
			/>
		</svg>
	</div>

	<section class="bg-(--j-bg-1) px-6 py-10 pb-12 dark:bg-(--j-bg-1-dark)">
		<div
			class="relative mx-auto flex max-w-3xl flex-col items-center gap-8 min-[700px]:flex-row min-[700px]:gap-12"
		>
			<div class="relative flex size-[200px] shrink-0 items-center justify-center">
				<div class="relative flex size-[140px] items-center justify-center">
					<div
						class="confetti absolute top-2.5 left-5 size-2 rounded-sm bg-(--j-orange)"
						style="animation-delay:0s"
					></div>
					<div
						class="confetti absolute top-[5px] right-[30px] size-2 rounded-sm bg-(--j-green)"
						style="animation-delay:0.5s"
					></div>
					<div
						class="confetti absolute top-5 left-[45%] size-2 rounded-sm bg-(--j-purple)"
						style="animation-delay:1s"
					></div>
					<div
						class="confetti absolute top-[15px] right-[15px] size-1.5 rounded-full bg-(--j-pink)"
						style="animation-delay:1.5s"
					></div>
					<div
						class="confetti absolute top-2 left-[50px] h-2.5 w-1.5 rounded-sm bg-(--j-gold)"
						style="animation-delay:0.8s"
					></div>
					<div
						class="confetti absolute top-[25px] right-[45px] size-2 rounded-full bg-(--j-green)"
						style="animation-delay:2s"
					></div>
					<PartyPopper size={36} class="anim-bob text-(--j-orange) dark:text-[#f0a888]" />
				</div>
			</div>

			<div class="flex-1">
				<h2
					class="mb-3 font-[Lilita_One,sans-serif] text-[clamp(1.5rem,4vw,2rem)] text-text"
				>
					That's it!
				</h2>
				<p class="mb-4 leading-relaxed text-text-muted">
					Group members can reserve items, while keeping everything a secret to the
					recipient. We give gifts to show appreciation, <b>stop making it stressful</b>.
				</p>
				<div class="flex flex-wrap gap-3">
					<span
						class="inline-flex items-center gap-1.5 rounded-full bg-black/5 px-3.5 py-1.5 text-sm font-semibold text-text dark:bg-white/6"
					>
						<ShieldCheck size={14} /> Secret reservations
					</span>
					<span
						class="inline-flex items-center gap-1.5 rounded-full bg-black/5 px-3.5 py-1.5 text-sm font-semibold text-text dark:bg-white/6"
					>
						<Heart size={14} /> No double gifts
					</span>
				</div>
			</div>
		</div>
	</section>

	<section class="relative px-6 py-12 text-center">
		<h2 class="mb-2 font-[Lilita_One,sans-serif] text-[clamp(1.6rem,4vw,2.2rem)] text-text">
			Why are you still reading?
		</h2>
		<p class="mb-8 text-lg text-text-muted">
			You've made it this far, you might as well make a wishlist now.
		</p>

		<div class="flex flex-col items-center gap-3 sm:flex-row sm:justify-center">
			<a
				href="/register"
				class="inline-flex items-center gap-2 rounded-xl bg-(--j-orange) px-8 py-3.5 font-[Lilita_One,sans-serif] text-lg text-white no-underline shadow-[0_4px_18px_rgba(232,128,92,0.3)] transition-all hover:-translate-y-0.5 hover:scale-[1.02] hover:shadow-[0_6px_24px_rgba(232,128,92,0.4)] dark:bg-[#f0a888] dark:text-[#1a1310]"
			>
				Let's go!
				<ArrowRight size={18} />
			</a>
			<a
				href="/login"
				class="rounded-xl border border-border px-6 py-3 text-[0.95rem] text-text-muted no-underline transition-all hover:border-text-muted hover:text-text"
			>
				I already have an account
			</a>
		</div>

		<p class="mt-10 flex items-center justify-center gap-1 text-sm text-text-muted">
			Built with <Heart size={12} class="text-(--j-pink)" /> by a real human, FWIW.
		</p>
	</section>
</div>

<style>
	.journey {
		--j-page-bg: #fffbf5;
		--j-page-bg-dark: #2d241f;
		--j-bg-1: #fef7ed;
		--j-bg-2: #eef6f0;
		--j-bg-3: #f0f0fa;
		--j-bg-1-dark: #3d2e28;
		--j-bg-2-dark: #24332c;
		--j-bg-3-dark: #2d2a3d;
		--j-orange: #e8805c;
		--j-green: #4a9a6a;
		--j-purple: #7b6baa;
		--j-pink: #d96b8a;
		--j-gold: #d4a44a;
	}

	@keyframes bob {
		0%,
		100% {
			transform: translateY(0);
		}
		50% {
			transform: translateY(-5px);
		}
	}

	@keyframes bounce-down {
		0%,
		100% {
			transform: translateY(0);
		}
		50% {
			transform: translateY(6px);
		}
	}

	@keyframes twinkle {
		0%,
		100% {
			opacity: 0.3;
			transform: scale(0.8);
		}
		50% {
			opacity: 1;
			transform: scale(1.1);
		}
	}

	@keyframes confetti-fall {
		0% {
			transform: translateY(0) rotate(0deg);
			opacity: 1;
		}
		100% {
			transform: translateY(90px) rotate(360deg);
			opacity: 0;
		}
	}

	.anim-bob {
		animation: bob 3s ease-in-out infinite;
	}

	.anim-bounce {
		animation: bounce-down 2s ease-in-out infinite;
	}

	.confetti {
		animation: confetti-fall 3s ease-in-out infinite;
	}
</style>
