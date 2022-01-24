import { serve } from "https://deno.land/std@0.120.0/http/server.ts";
import { ripgen } from "https://raw.githubusercontent.com/hironichu/DenoRipgen/main/mod/ripgendeno.js"
import { init, decompress, compress } from 'https://deno.land/x/zstd_wasm/deno/zstd.ts';
import { ConnInfo } from 'https://deno.land/std/http/server.ts'
await init();
let Wordlist: string | boolean = "";
const init_wordlist = async () => {
	const wordlistbin =  await(await fetch(new URL('https://raw.githubusercontent.com/hironichu/DenoRipgen/main/wordlist/wordlist.zst'))).arrayBuffer()
	const wordlistbinbuf = new Uint8Array(wordlistbin);
	if (!wordlistbinbuf) throw `Invalid file content`
	const dec = decompress(wordlistbinbuf!);
	return new TextDecoder().decode(dec) 
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
		if (count > 30 && time - new Date(lastTime).getTime() < 86400000) {
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
						font-family: arial;
            margin:0;
            padding:0;
					}
					h1 {
    font-family: arial;
    color: white;
    text-transform: uppercase;
					}
          small {
    text-align: center;
    width: 500px;
    color: white;
          }
          a {
                color: gray;
          }
          input[type="text" i] {
            border: none;
    border-radius: 3px;
    padding: 5px;
          }
          .container {
display: flex;
    justify-content: center;
    align-items: center;
    height: 100vh;
    width: 100vw;
    flex-direction: column;
    background-color: #161616;
          }
        
          input[type="submit"] {
                border: none;
    background: #ffffff;
    border-radius: 2px;
    font-family: arial;
    font-weight: 700;
    font-size: 10px;
    margin: 15px auto;
    padding: 7px 16px;
    display: flex;
    cursor: pointer;
    text-transform: uppercase;
          }
          label {
                font-size: 11px;
    text-transform: uppercase;
    color: white;
    display: flex;
    margin: 9px auto;
    text-align: center;
          }
          form{
            display: flex;
            flex-direction: column;
          }
          .container>small {
            text-align:center;
            width: 500px;
          }
					</style>
					</head>
					<body>
          <div class="container">
					  <h1>Deno Ripgen</h1>
            <form action="/ripgen" method="post" enctype="multipart/form-data">
              <label for="file">Subdomain</label>
              <input type="text" name="subdomains" placeholder="www.google.com" accept=".txt">
              <input type="submit" value="execute" name="execute">
            </form>
            <small>Wasm version available here for Deno : https://github.com/hironichu/DenoRipgen , made by Hiro, original library made by <a href="https://github.com/d0nutptr"  target="_blank">d0nutptr 🍩</a> sources here <a href="https://github.com/resyncgg/ripgen" target="_blank">https://github.com/resyncgg/ripgen</a>
          </div>
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
					try {
						const formdata = await req.formData()
						if (formdata.has('subdomains')) {
							//Check if this is a valid subdomain
							const subdomains = formdata.get('subdomains') as string;
							if (subdomains.match(/^[a-zA-Z0-9-_.]+$/)) {
								//Check if this subdomain is already in the list
								if (Subdomainlist.has(subdomains)) {
									const {file, time} = Subdomainlist.get(subdomains)!;
									if (time.getTime() + 86400000 > time.getTime()) {
										const decompressed = decompress(file)
										return new Response(decompressed, {
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
										let timerId: number | undefined;
										let start = 0;
										let end = 50000;
										let buff = "";
										const time = new Date();
										const stream = new ReadableStream({
										  start(controller) {
											timerId = setInterval(() => {
												const lines = (Wordlist as string).split('\n').slice(start, end);
												if (lines.length > 0) {
													start += 50000;
													end += 50000;
													const res = ripgen(subdomains, lines.join('\n'))
													// const compressed = compress(new TextEncoder().encode(res), 10)
													// Subdomainlist.set(subdomains, {
													// 	file: compressed,
													// 	time,
													// });
													controller.enqueue(new TextEncoder().encode(res));
												} else {
													clearInterval(timerId);
													controller.close();
												}
											}, 0);
										  },
										  cancel() {
											if (typeof timerId === "number") {
											  clearInterval(timerId);
											}
										  },
										});
										 
										
										return new Response(stream, {
											headers: {
												"Content-Type": "text/event-stream",
												"X-Time": new Date().toISOString(),
											},
											status: 200,
										});
									} catch {
										return new Response('Error', {status: 500})
									}
								}
							} else {
								return new Response('Invalid subdomain', {status: 400})
							}
						}	
					} catch (e) {
						return new Response('Internal error', {status: 500})
					}
				}
			}
		}
		return new Response('Not found', {status: 404});
}
Wordlist = await init_wordlist()
if (!Wordlist) throw 'Error while loading wordlist'
await serve(handler)
