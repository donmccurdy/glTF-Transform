<script lang="ts">
	import { page } from '$app/stores';
	import type { LayoutData } from './$types';

	export let data: LayoutData;

	let innerWidth: number;

	const resourceSection = data.navigation.sections.find(({ title }) => title === 'Resources');
	const resources = resourceSection.items.filter(({ external }) => external);

	const LG = 900;
	const SM = 450;

	function toggleNav() {
		document.body.classList.toggle('toggle-nav');
	}
</script>

<svelte:head>
	<title>{$page.data.metadata.title}</title>
	<meta name="description" content={$page.data.metadata.snippet} />
	<link rel="canonical" href={'https://gltf-transform.dev' + $page.url.pathname} />

	<meta property="og:site_name" content="glTF Transform" />
	<meta property="og:title" content={$page.data.metadata.title} />
	<meta property="og:description" content={$page.data.metadata.snippet} />
	<meta property="og:url" content={'https://gltf-transform.dev' + $page.url.pathname} />
	<meta name="og:image" content="/media/hero.jpg" />
	<meta name="og:image:alt" content="Function symbol, where the argument and output are a box labeled 'glTF'." />
	<meta name="og:image:width" content="2000" />
	<meta name="og:image:height" content="1000" />
	<meta name="twitter:card" content="summary_large_image" />
	<meta name="twitter:title" content={$page.data.metadata.title} />
	<meta name="twitter:description" content={$page.data.metadata.snippet} />
	<meta name="twitter:url" content={'https://gltf-transform.dev' + $page.url.pathname} />
	<meta name="twitter:image" content="/media/hero.jpg" />
	<meta name="twitter:image:alt" content="Function symbol, where the argument and output are a box labeled 'glTF'." />
	<meta name="twitter:label1" content="Written by" />
	<meta name="twitter:data1" content="Don McCurdy" />
	<meta name="twitter:creator" content="@donrmccurdy" />
</svelte:head>

<svelte:window bind:innerWidth />

<header>
	<ul class="greendoc-toolbar">
		<li><strong><a class="title" href="/">glTF Transform</a></strong></li>
		{#if innerWidth > SM}
			<li>
				<a
					class="greendoc-toolbar-badge"
					target="_blank"
					href="https://github.com/donmccurdy/glTF-Transform"
					rel="noreferrer"
				>
					<img
						alt="GitHub stars"
						src="https://img.shields.io/github/stars/donmccurdy/glTF-Transform?style=social"
					/>
				</a>
			</li>
		{/if}
		<li class="flex" />
		{#if innerWidth > LG}
			{#each resources as resource}
				<li>
					<a target="_blank" href={resource.href} rel="noreferrer">{resource.text}</a>
				</li>
			{/each}
		{/if}
		<li>
			<a class="greendoc-toolbar-pro-btn" target="_blank" href="https://gltf-transform.dev/pro" rel="noreferrer">
				{#if innerWidth > 580}Get glTF Transform{/if} Pro 💎
			</a>
		</li>
		{#if innerWidth <= LG}
			<li class="greendoc-widget-item">
				<button class="greendoc-widget menu no-caption" on:click={toggleNav}>Menu</button>
			</li>
		{/if}
	</ul>
</header>
<nav class="greendoc-navigation">
	{#each data.navigation.sections as section}
		<section>
			<h4>{section.title}</h4>
			<ul>
				{#each section.items as item}
					<li>
						<a
							href={item.href}
							class:active={item.href === $page.url.pathname}
							target={item.external ? '_blank' : ''}
							rel={item.external ? 'noreferrer' : ''}
						>
							{item.text}
						</a>
					</li>
				{/each}
			</ul>
			{#if section.subsections.length}
				{#each section.subsections as subsection}
					<section>
						<h5>{subsection.title}</h5>
						<ul>
							{#each subsection.items as item}
								<li>
									<a
										href={item.href}
										class:active={item.href === $page.url.pathname}
										target={item.external ? '_blank' : ''}
										rel={item.external ? 'noreferrer' : ''}
									>
										{item.text}
									</a>
								</li>
							{/each}
						</ul>
					</section>
				{/each}
			{/if}
		</section>
	{/each}
</nav>

<div class="container container-main">
	<div class="content-wrap">
		<slot />
		<div class="container greendoc-generator">
			<img
				src="/media/kicker.jpg"
				alt="Function symbol, where the argument and output are a box labeled 'glTF'."
			/>
			<p>
				<i>
					Made by <a href="https://www.donmccurdy.com/" target="_blank" rel="noopener">Don McCurdy</a>.
					Documentation built with
					<a href="https://github.com/donmccurdy/greendoc" target="_blank">greendoc</a>
					and published under
					<a href="https://creativecommons.org/licenses/by/3.0/us/" target="_blank" rel="noopener"
						>Creative Commons Attribution 3.0</a
					>.
				</i>
			</p>
		</div>
	</div>
</div>
