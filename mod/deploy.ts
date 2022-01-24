import { serve } from "https://deno.land/std@0.120.0/http/server.ts";
import { ripgen } from "https://raw.githubusercontent.com/hironichu/DenoRipgen/main/mod/ripgendeno.js"
import { init, decompress, compress } from 'https://deno.land/x/zstd_wasm/deno/zstd.ts';

await init();
let Wordlist: string | boolean = "";
const init_wordlist = async () => {
	const wordlistbin =  await fetch('https://raw.githubusercontent.com/hironichu/DenoRipgen/main/wordlist/wordlist.zst');
	const body = wordlistbin.body?.getReader()
	if (body) {
		const filecontent = await body.read().then(({value}) => value);
		const dec = decompress(filecontent!);
		return new TextDecoder().decode(dec)
	}
	return false
}
const reqCountPerIP = new Map<string, {count: number, lastTime: Date}>()
const Subdomainlist = new Map<string, {file: Uint8Array, time: Date}>();

async function handler(req: Request, connInfo: ConnInfo) {
	const time = Date.now()
	const addr = connInfo.remoteAddr as Deno.NetAddr;
	const ip = addr.hostname;
	const requrl = new URL(req.url);
	if (reqCountPerIP.has(ip)) {
		const {count, lastTime} = reqCountPerIP.get(ip)!;
		if (count > 20 && time - new Date(lastTime).getTime() < 86400000) {
			console.info(`IP ${ip} reached quota `)
			//clear data
			return new Response("Too many requests",{
				status: 429,
			})
		} else if (count > 20) {
			reqCountPerIP.set(ip, {count: 1, lastTime: new Date()});
		} else {
			reqCountPerIP.set(ip, {count: count + 1, lastTime: new Date()});
		}
	} else {
		reqCountPerIP.set(ip, {count: 1, lastTime: new Date()});
	}
	switch (req.method) {
		case "GET": {
				return new Response(
					`<!DOCTYPE html>
					<html>
					<head>
					<title>Deno Ripgen</title>
					<meta charset="utf-8">
					<meta name="viewport" content="width=device-width, initial-scale=1">
					<style>
					body {
					}
					h1 {
						font-familly: arial;
					}
					</style>
					</head>
					<body>
					<h1>Deno Ripgen</h1>
					<form action="/ripgen" method="post" enctype="multipart/form-data">
						<label for="file">Subdomain</label>
						<input type="text" name="subdomains" placeholder="www.google.com" accept=".txt">
						<input type="submit" value="execute" name="execute">
					</form>
					<small>Wasm version available here for Deno : https://github.com/hironichu/DenoRipgen , made by Hiro, original library made by <a href="https://github.com/d0nutptr">d0nutptr 🍩</a>
					</body>
					</html>`,
					{
						headers: {
							"content-type": "text/html",
						},
					});
			}
			case "POST": {
				if (requrl.pathname.startsWith('/ripgen')) {
					const formdata = await req.formData();
					if (formdata.has('subdomains')) {
						//Check if this is a valid subdomain
						const subdomains = formdata.get('subdomains') as string;
						if (subdomains.match(/^[a-zA-Z0-9-_.]+$/)) {
							//Check if this subdomain is already in the list
							if (Subdomainlist.has(subdomains)) {
								//get the file decompress and render it
								const {file, time} = Subdomainlist.get(subdomains)!;
								if (time.getTime() + 86400000 > time.getTime()) {
									return new Response(decompress(file), {
										headers: {
											"Content-Type": "text/plain",
											"X-Time": time.toISOString(),
										},
										status: 200,
									})
								}
							} else {
								//Generate the file and add it to the list
								try {
									const file = await ripgen(subdomains, Wordlist as string);
									const time = new Date();
									Subdomainlist.set(subdomains, {file: compress(file, 10) , time});
									return new Response(file, {
										headers: {
											"Content-Type": "text/plain",
											"X-Time": time.toISOString(),
										},
										status: 200,
									})
								} catch {
									return new Response('Error', {status: 500})
								}
							}
						} else {
							return new Response('Invalid subdomain', {status: 400})
						}
					}
				}
			}
		}
}
Wordlist = await init_wordlist()
if (!Wordlist) throw 'Error while loading wordlist'
await serve(handler)
