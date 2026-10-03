import { createServer, request, type Server } from 'node:http';
import { connect, type AddressInfo } from 'node:net';

import { parseUrl } from '$lib/util/url';

import { resolvePublicAddress } from './public-address';

const parseAuthority = (authority: string) => {
	const url = parseUrl(`http://${authority}`);
	if (!url) return;
	return { hostname: url.hostname, port: Number(url.port || 80) };
};

const createPublicProxy = () => {
	const server = createServer(async (req, res) => {
		const target = parseUrl(req.url ?? '');
		const address =
			target?.protocol === 'http:' ? await resolvePublicAddress(target.hostname) : undefined;
		if (!target || !address) return res.writeHead(403).end();

		const { 'proxy-connection': _, 'proxy-authorization': __, ...headers } = req.headers;
		const upstream = request(
			{
				host: address,
				port: target.port || 80,
				method: req.method,
				path: target.pathname + target.search,
				headers,
			},
			(upstreamRes) => {
				res.writeHead(upstreamRes.statusCode ?? 502, upstreamRes.headers);
				upstreamRes.pipe(res);
			},
		);

		upstream.on('error', () => res.destroy());
		req.pipe(upstream);
	});

	server.on('connect', async (req, socket, head) => {
		socket.on('error', () => socket.destroy());

		const authority = parseAuthority(req.url ?? '');
		const address = authority && (await resolvePublicAddress(authority.hostname));
		if (!authority || !address) return socket.end('HTTP/1.1 403 Forbidden\r\n\r\n');

		const upstream = connect(authority.port, address, () => {
			socket.write('HTTP/1.1 200 Connection Established\r\n\r\n');
			upstream.write(head);
			upstream.pipe(socket);
			socket.pipe(upstream);
		});

		upstream.on('error', () => socket.destroy());
		socket.on('close', () => upstream.destroy());
	});

	return server;
};

let proxy: Promise<Server> | undefined;

/**
 * Starts (once) a local proxy that only lets traffic through to publicly routable addresses,
 * connecting to the exact address it checked so DNS cannot change in between.
 *
 * @returns the proxy server URL
 */
export const getPublicProxyUrl = async () => {
	proxy ??= new Promise<Server>((resolve, reject) => {
		const server = createPublicProxy();
		server.once('error', reject);
		server.listen(0, '127.0.0.1', () => resolve(server));
	}).catch((err) => {
		proxy = undefined;
		throw err;
	});

	const { port } = (await proxy).address() as AddressInfo;
	return `http://127.0.0.1:${port}`;
};
