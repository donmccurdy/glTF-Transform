<script lang="ts">
	import { page } from '$app/stores';
	import type { LayoutData } from './$types';

	export let data: LayoutData;

	function toggleNav() {
		document.body.classList.toggle('toggle-nav');
	}
</script>

<svelte:head>
	<title>{$page.data.metadata.title}</title>
	<meta name="description" content={$page.data.metadata.snippet} />
	<link rel="canonical" href={'https://gltf-transform.dev' + $page.url.pathname} />

	<meta property="og:site_name" content="glTF-Transform" />
	<meta property="og:title" content={$page.data.metadata.title} />
	<meta property="og:description" content={$page.data.metadata.snippet} />
	<meta property="og:url" content={$page.url.href} />
	<meta name="og:image" content="/media/hero.jpg" />
	<meta name="og:image:alt" content="Function symbol, where the argument and output are a box labeled 'glTF'." />
	<meta name="og:image:width" content="2000" />
	<meta name="og:image:height" content="1000" />
	<meta name="twitter:card" content="summary_large_image" />
	<meta name="twitter:title" content={$page.data.metadata.title} />
	<meta name="twitter:description" content={$page.data.metadata.snippet} />
	<meta name="twitter:url" content={$page.url.href} />
	<meta name="twitter:image" content="/media/hero.jpg" />
	<meta name="twitter:image:alt" content="Function symbol, where the argument and output are a box labeled 'glTF'." />
	<meta name="twitter:label1" content="Written by" />
	<meta name="twitter:data1" content="Don McCurdy" />
	<meta name="twitter:creator" content="@donrmccurdy" />
</svelte:head>

<header>
	<div class="greendoc-page-toolbar">
		<div class="container">
			<div class="table-wrap">
				<div class="table-cell">
					<strong><a href="/">glTF-Transform</a></strong>
					<a
						class="header-badge"
						target="_blank"
						href="https://github.com/donmccurdy/glTF-Transform"
						rel="noreferrer"
					>
						<img
							alt="GitHub stars"
							src="https://img.shields.io/github/stars/donmccurdy/glTF-Transform?style=social"
						/>
					</a>
				</div>
				<div class="table-cell" id="greendoc-widgets">
					<button id="greendoc-menu" class="greendoc-widget menu no-caption" on:click={toggleNav}>Menu</button
					>
				</div>
			</div>
		</div>
	</div>
</header>
<nav class="greendoc-navigation secondary">
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
				<span class="line"
					>Made by <a href="https://twitter.com/donrmccurdy" target="_blank" rel="noopener">Don McCurdy</a
					></span
				>
				<span class="divider">•</span>
				<span class="line"
					>Documented with <a href="https://github.com/donmccurdy/greendoc" target="_blank">greendoc</a></span
				>
				<span class="divider">•</span>
				<span class="line"
					>&copy; 2023 <a
						href="https://github.com/donmccurdy/glTF-Transform/blob/master/LICENSE"
						target="_blank">MIT License</a
					></span
				>
			</p>
		</div>
	</div>
</div>
