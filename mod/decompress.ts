import { init, decompress, compress } from 'https://deno.land/x/zstd_wasm/deno/zstd.ts';

await init();

const wordlistbin =  await fetch('http://0.0.0.0:8000/wordlist/wordlist.zst');
const body = wordlistbin.body?.getReader()
if (body) {
	const filecontent = await body.read().then(({value}) => value);
	const dec = decompress(filecontent!);
	console.log(new TextDecoder().decode(dec))
}
