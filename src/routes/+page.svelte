<script lang="ts">
	import WishlistItem from '$lib/components/wishlist-item.svelte';
	import type { WishlistItem as WishlistItemType } from '$lib/server/db/schema';

	const items: WishlistItemType[] = [
		{
			wishlistId: '1',
			id: '1',
			createdAt: new Date(),
			name: 'Sony WH-1000XM5 Wireless Headphones',
			notes: `Need some good noise-cancelling headphones for focus while working and for travel.`,
			url: 'https://www.bestbuy.com/site/sony-wh1000xm5-wireless-noise-cancelling-over-the-ear-headphones-black/6505725.p',
			imageUrl:
				'https://pisces.bbystatic.com/image2/BestBuy_US/images/products/6505/6505725_sd.jpg;maxHeight=1000;maxWidth=1000',
			price: 399.99,
			priceCurrency: 'USD',
		},
		{
			wishlistId: '1',
			id: '2',
			createdAt: new Date(),
			name: 'Fellow Stagg EKG Electric Gooseneck Kettle',
			notes: `For making the perfect pour-over coffee in the morning. Matte black version.
            
The only thing i hate is..
                        
`,
			url: 'https://fellowproducts.com/products/stagg-ekg-electric-pour-over-kettle',
			imageUrl:
				'https://fellowproducts.com/cdn/shop/files/StaggPro_DR_-_1.png?v=1757441408&width=550',
			price: 165.0,
			priceCurrency: 'USD',
		},
		{
			wishlistId: '1',
			id: '3',
			createdAt: new Date(),
			name: 'Apple AirTag',
			notes: 'So I can stop losing my keys every other day.',
			url: 'https://www.apple.com/shop/buy-airtag/airtag',
			imageUrl:
				'https://store.storeimages.cdn-apple.com/1/as-images.apple.com/is/airtag-double-select-202104_FMT_WHH?wid=2000&hei=2000&fmt=jpeg&qlt=90&.v=aUZiM0Z1TmxieDdSR0Z6RU5uemRuOHVJWlMva2FYSFVWb3Q4TXJyVGJVY2VnSEp2SE4xaUJuS0VhaWlSWW9obFBJSEI4eEprQ3k5NVh3Y3BXYkFrUFNsZGR5cUwzMzFEcGtUWTFWWHlHNDhsZjhjS2U1N1RFQ3VYKzBrK3l5TkI',
			price: 29.0,
			priceCurrency: 'USD',
		},
		{
			wishlistId: '1',
			id: '4',
			createdAt: new Date(),
			name: 'SteelSeries Apex Pro TKL Mechanical Keyboard',
			notes: 'Want to try an adjustable mechanical keyboard for a better typing feel.',
			url: 'https://steelseries.com/gaming-keyboards/apex-pro-tkl-2023',
			imageUrl:
				'https://images.ctfassets.net/hmm5mo4qf4mf/5T6OTTzl1B5zaX1nILPFw4/186d8f786745424cdd8770cda23623af/apex_pro_tkl_wl_img_buy_01.png?fm=webp&q=90&fit=scale&w=1200',
			price: 189.99,
			priceCurrency: 'USD',
		},
		{
			wishlistId: '1',
			id: '5',
			createdAt: new Date(),
			name: 'The North Face Borealis Backpack',
			notes: 'A solid everyday backpack for work and short trips. The TNF Black color.',
			url: 'https://www.thenorthface.com/en-us/bags-and-gear/backpacks-c224451/borealis-backpack-pNF0A52SE',
			imageUrl:
				'https://assets.thenorthface.com/images/t_img/f_auto,h_400,w_344,e_unsharp_mask:100/dpr_2.0/v1723436580/NF0A52SE53Z-HERO/Borealis-Backpack.png',
			price: 99.0,
			priceCurrency: 'USD',
		},
		{
			wishlistId: '1',
			id: '6',
			createdAt: new Date(),
			name: '"Project Hail Mary" by Andy Weir (Hardcover)',
			notes: 'Loved The Martian, so this should be great too. Sci-fi is the best!',
			url: 'https://www.barnesandnoble.com/w/project-hail-mary-andy-weir/1137632969',
			imageUrl: 'https://prodimage.images-bn.com/pimages/9780593135204_p0_v5_s1200x630.jpg',
			price: 17.99,
			priceCurrency: 'USD',
		},
		{
			wishlistId: '1',
			id: '7',
			createdAt: new Date(),
			name: 'Logitech MX Master 3S Wireless Mouse',
			notes: 'Heard this is the best ergonomic mouse for productivity.',
			url: 'https://www.logitech.com/en-us/products/mice/mx-master-3s.910-006556.html',
			imageUrl:
				'https://resource.logitech.com/w_800,c_lpad,ar_1:1,q_auto,f_auto,dpr_1.0/d_transparent.gif/content/dam/logitech/en/products/mice/mx-master-3s/gallery/mx-master-3s-mouse-top-view-graphite.png?v=1',
			price: 99.99,
			priceCurrency: 'USD',
		},
	];
</script>

<div class="grid">
	{#each items as item}
		<WishlistItem {item} />
	{/each}
</div>

<style>
	.grid {
		padding: 1rem;

		display: grid;
		grid-template-columns: repeat(auto-fit, minmax(300px, 1fr));
		grid-auto-rows: auto;
		align-content: start;
		gap: 1rem;
	}
</style>
