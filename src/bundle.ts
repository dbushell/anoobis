import * as path from "jsr:@std/path";
import { encodeBase64 } from "jsr:@std/encoding/base64";

/** Bundle all assets into one HTML document */
export const bundle = async (dir: string): Promise<string> => {
  let [html, css, js, wasm] = await Promise.all([
    Deno.readTextFile(
      path.join(dir, "main.html"),
    ),
    Deno.readTextFile(
      path.join(dir, "main.css"),
    ),
    Deno.readTextFile(
      path.join(dir, "main.js"),
    ),
    Deno.readFile(
      path.join(dir, "main.wasm"),
    ).then(encodeBase64),
  ]);
  // Wasm module is embedded base64 encoded URL
  js = js.replace(
    new RegExp(RegExp.escape('const wasmURL = "";')),
    () => `const wasmURL = "data:application/wasm;base64,${wasm}";`,
  );
  // Inline JavaScript
  html = html.replace(
    new RegExp(`(<script[^>]*?>).*?(</script>)`),
    (...match) => (`${match[1]}\n${js.trim()}\n${match[2]}`),
  );
  // Inline CSS stylesheet
  html = html.replace(
    new RegExp(`(<style>).*?(</style>)`),
    (...match) => (`${match[1]}\n${css.trim()}\n${match[2]}`),
  );
  return html;
};
