import { init, decompress, compress } from 'https://deno.land/x/zstd_wasm/deno/zstd.ts';
init();
const wordlist = await (await fetch('https://raw.githubusercontent.com/hironichu/DenoRipgen/main/wordlist/list.txt')).arrayBuffer();
const compressed = compress(wordlist, 10)

//export the compressed wordlist to a binary
Deno.writeFileSync('wordlist.zst', compressed);