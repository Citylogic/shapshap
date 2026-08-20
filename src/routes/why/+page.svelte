<script lang="ts">
	const REPO = 'github.com/Citylogic/shapshap';
</script>

<div class="page">
	<main>
		<p class="lead">No accounts, and not much kept.</p>
		<p>
			You never sign in and we never ask for an email address. A meeting is just a link. Anyone who
			has that link can see it, change it, or delete it — including other people's answers. Send it
			to people you'd meet.
		</p>
		<p>
			We store the days and times you picked, the name each person types, and the slots they marked.
			We can read that. It's on one server in London, it isn't sold or shared, and it isn't used for
			anything except showing you the overlap.
		</p>
		<p>
			Use a first name and an initial. There's no subject line on purpose — don't put one in the
			name field.
		</p>
		<p>
			We keep server logs to run the service, with the meeting's ID stripped out of them. We
			rate-limit by IP address to stop abuse; those addresses stay in memory for a minute and aren't
			stored.
		</p>
		<p>
			Everything is deleted 24 hours after the last time slot, and gone from our backups within 30
			days.
		</p>
		<p>
			Lose the link and the meeting is gone. There's no recovery, and no way for us to find it for
			you.
		</p>
		<p>Run your own: <a href="https://{REPO}">{REPO}</a></p>
	</main>
</div>

<style>
	:global(html, body) {
		margin: 0;
		background: #f3efe6;
	}

	.page {
		--bg: #f3efe6;
		--ink: #1c1a16;
		box-sizing: border-box;
		min-height: 100dvh;
		margin: 0 auto;
		padding: 1.25rem 1.25rem 2rem;
		max-width: 28rem;
		background: var(--bg);
		color: var(--ink);
		font-family: -apple-system, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;
	}

	main {
		display: flex;
		flex-direction: column;
		gap: 1.1rem;
	}

	p {
		margin: 0;
		font-size: 1rem;
		line-height: 1.45;
	}

	.lead {
		font-size: 1.75rem;
		font-weight: 650;
		letter-spacing: -0.02em;
		line-height: 1.2;
	}

	a {
		color: inherit;
	}
</style>
