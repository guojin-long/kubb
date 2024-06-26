---
layout: doc

title: Config
outline: deep
---

# plugins

- **Type:** `Array<KubbUserPlugin>` <br/>

An array of Kubb plugins to use. The plugin/package can have some extra options defined by the plugin.
Sometimes a plugin is dependent on another plugin, if that's the case you will get an error back from the plugin you installed.([see pre](/reference/pluginManager/)).<br/><br/>

How to use and set up plugins, see [plugins](/plugins/overview).

::: code-group

```typescript twoslash [kubb.config.ts]
import { defineConfig } from '@kubb/core'
import { pluginOas } from '@kubb/plugin-oas'

export default defineConfig({
  input: {
    path: './petStore.yaml',
  },
  output: {
    path: './src/gen',
  },
  plugins: [
    pluginOas({
      output: {
        path: 'schemas',
      },
      validate: true,
    }),
  ],
})
```

:::
