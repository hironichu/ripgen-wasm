# RipGen Wasm

## A Wasm port of the amazing [RipGen](https://github.com/resyncgg/ripgen/) module made by [@d0nutptr](https://github.com/d0nutptr)
<img src="https://github.com/hironichu/ripgen-deno/raw/main/assets/RipgenGithub.png" height="auto">


> WIP (Still writing this at the moment the API is not stablized yet)

```js
import "https://deno.land/x/ripgen@0.0.5/web.js";


//First you need to call off the wordlist method, it is a static method and it will return a new class object
const RipGen = await ripgen.wordlist('url');
//Ripgen also support the use of ZSTD compressed wordlist, you can use the second argument to let it know if it needs to decompress or not.
const RipGen = await ripgen.wordlist('https://raw.githubusercontent.com/hironichu/DenoRipgen/main/wordlist/wordlist.zst', true);

//You can check the number of words by calling 
RipGen.words.length

//You can set the number of threads as a second argument of exec();
// Please note that the number of threads affect performance depending on how many permutations you want to generate.
ripgen.exec("www.google.com", 1);
// ripgen.exec("www.google.com", 4);
// ripgen.exec("www.google.com", 16);

//After (or before the exec) you can wait for the Data event, it will return most of the result but not all as it is not possible to know how many permutations will be generated.
//I plan to add a way to get every permutation with the even but only in Deno.
ripgen.addEventListener("data", (e) => {
	//result returned in event.
	//e.detail can be a string or an array of string.
	console.log(e.detail);
}
//Triggering the Run will execute all the Worker in any order, note that tsome worker may take longer to execute than others.
ripgen.run();
//You can also stop the execution of the workers by calling the stop() method.
ripgen.stop();

```


Credits to [D0nutptr](https://github.com/d0nutptr) for the original version of the tool.