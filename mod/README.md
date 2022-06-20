#RipGen

A rust-(wasm)based version of the popular Dnsgen tool

WIP
```
import "https://deno.land/x/ripgen/web.js";

ripgen.wordlist('url');

ripgen.exec("word", 1);
ripgen.addEventListener("data", (e) => {
	//result returned in event.
	console.log(e.detail);
}
ripgen.run();
```