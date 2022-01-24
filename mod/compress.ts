import { init, decompress, compress } from 'https://deno.land/x/zstd_wasm/deno/zstd.ts';

await init();
const wordlist =  await fetch('http://0.0.0.0:8000/wordlist/list.txt');
const body = wordlist.body?.getReader()
if (body) {
	const filecontent = await body.read().then(({value}) => value);
	const file = new Uint8Array(filecontent!)
	const enc = compress(file!, 10);
	Deno.writeFileSync('wordlist/wordlist.zst', enc);
}