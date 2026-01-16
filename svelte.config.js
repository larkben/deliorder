import adapter from "@sveltejs/adapter-node";
import preprocess from "svelte-preprocess";

export default {
  preprocess: preprocess(),

  kit: {
    adapter: adapter({
      // default options are fine; we'll use process.env.PORT at runtime
      out: "build",
      precompress: true,
      envPrefix: "",
    }),
    vite: {
      server: {
        // optional: port for local dev
        port: 5173,
      },
    },
  },
};
