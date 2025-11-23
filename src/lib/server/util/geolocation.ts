import { dev } from '$app/environment';
import z from 'zod';

export const GeolocationSchema = z.object({
	latitude: z.number(),
	longitude: z.number(),
	timezone: z.string().optional().nullable(),
});

export type Geolocation = z.infer<typeof GeolocationSchema>;

const GeoResponseSchema = z.object({
	success: z.literal(true),
	lat: z.number(),
	lon: z.number(),
	timezone: z.string().optional().nullable(),
});

export const requestGeolocation = async (clientAddress: string) => {
	if (
		dev ||
		!clientAddress ||
		clientAddress === '127.0.0.1' ||
		clientAddress === '::1' ||
		clientAddress.startsWith('192.168.')
	) {
		return;
	}

	const url = `http://ip-api.com/json/${clientAddress}?fields=status,lat,lon,timezone`;
	try {
		const res = await fetch(url).then((res) => res.json());

		const geo = GeoResponseSchema.parse(await res.json());
		return {
			latitude: geo.lat,
			longitude: geo.lon,
			timezone: geo.timezone,
		} satisfies Geolocation;
	} catch (error) {
		console.warn(`Geolocation request \"${url}\":\n${error}`);
	}
};
