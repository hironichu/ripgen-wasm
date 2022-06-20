// import { ripgen } from "./ripgendeno.js";
(() => {
  window.ripgen = class ripgen extends EventTarget {
    words = [];
    constructor(words = []) {
      super();
      this.words = words;
    }
    static listcount = 0;
    static ready = false;
    static async wordlist(url, zst = false) {
      if (!url) {
        throw new Error(`🚫 RIPGEN: No URL provided`);
      }
      let result;
      if (zst) {
        const workerCode = `
			self.onmessage = async (e) => {
				console.log("📝 RIPGEN: Worker: Start");
				const { decompress } = await (await import("https://deno.land/x/zstd_web@0.2/zstd.js"));
				try {
					const url = e.data;
					const wordlistbin =  new Uint8Array(await(await fetch(new URL(url))).arrayBuffer())
					if (!wordlistbin) throw \`Invalid file content\`
					const dec = decompress(wordlistbin);
					console.debug(\`📝 RIPGEN: Wordlist loaded (\${dec.length} bytes)\`);
					self.postMessage(dec, [dec.buffer]);
					self.close();
				} catch (e) {
					throw \`🚫 RIPGEN: \${e}\`
				}
			}`;
        const worker = new Worker(URL.createObjectURL(new Blob([workerCode])));
        worker.postMessage(url);
        worker.onmessageerror = (e) => {
          console.error(`🚫 RIPGEN: Worker: ${e.message}`);
          worker.terminate();
          this.ready = false;
        };
        worker.onmessage = (e) => {
          if (e.data instanceof Uint8Array) {
            result = new TextDecoder().decode(e.data).split("\n");
            worker.terminate();
            this.ready = true;
          }
        };
        worker.onerror = (e) => {
          console.error(e.message);
          worker.terminate();
          this.ready = false;
        };
      } else {
        const text = await (await fetch(new URL(url))).text();
        if (!text) {
          this.ready = false;
          throw `Invalid file content`;
        }
        result = text.split("\n");
        this.ready = true;
      }
      while (!this.ready) {
        await new Promise((r) => setTimeout(r, 100));
      }
      return new ripgen(result);
    }
    static ready = false;
    static ondata = new CustomEvent("data", {
      bubbles: true,
      cancelable: true,
    });
    amount = 0;
    resultdata = [];
    processed = 0;
    workers = new Set();
    // wordlist = "";
    exec(domain, threads = 4) {
      if (!domain) throw `🚫 RIPGEN: No domain provided`;
      this.domain = domain;
      this.threads = threads;

      if ((!this.words || this.words === [] || this.words.length === 0)) {
        throw `🚫 RIPGEN: Wordlist not loaded`;
      }
      for (let i = 0; i < threads; i++) {
        const worker = new Worker(URL.createObjectURL(
          new Blob([`
self.onmessage = async (e) => {
	console.log(\`📝 RIPGEN: Worker ${i}: Start (\${e.data.length} words)\`);
	const { ripgen } = await import('${
            new URL("./ripgendeno.js", import.meta.url).href
          }');
	try {
		const domain = "${domain}"
		const result = ripgen(domain, e.data);
		console.debug(\`📝 RIPGEN: Worker ${i}: \${result.length} results\`);
		self.postMessage(result);
		console.debug(\`📝 RIPGEN: Worker ${i}: Done\`);
		self.postMessage("finished");
		self.close("finished");
	} catch (e) {
		console.error(e);
		self.close();
	}
}`]),
        ));
        console.log(this.workers);
        this.workers.add(worker);
        worker.onmessage = (e) => {
          if (e.data !== "finished") {
            this.amount += e.data.length;
            this.resultdata.push(e.data);
            if (this.amount >= 2500) {

              this.dispatchEvent(
                new CustomEvent("data", {
                  bubbles: true,
                  cancelable: true,
                  detail: e.data.slice(0, 500),
                }),
              );
              this.processed += 500;
            }
          } else {
            worker.terminate();
            this.workers.delete(worker);
            if (this.workers.size === 0) {
              this.dispatchEvent(
                new CustomEvent("done", {
                  bubbles: true,
                  cancelable: true,
                  detail: this.amount,
                }),
              );
            }
          }
        };
      }
      return this.workers;
    }
    run() {
      Promise.all([
        [...this.workers].map((w, i) =>
          w.postMessage(
            this.words.slice(
              i * this.words.length / this.threads,
              (i + 1) * this.words.length / this.threads,
            ),
          )
        ),
      ]);
      console.debug(`📝 RIPGEN: Workers started`);
    }
    download() {
      const blob = new Blob([[...this.resultdata].join("\n")], {
        type: "text/plain",
      });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `result-${this.domain}-${Date.now()}.txt`;
      a.click();
      URL.revokeObjectURL(url);
      this.stop();
    }
    stop = () => {
      Promise.all([
        this.workers.forEach((w) => {
          w.terminate();
          this.workers.delete(w);
        }),
      ]);
      this.workers.clear();
    };
  };
})();
